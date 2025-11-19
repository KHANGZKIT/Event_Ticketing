import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import axios from "axios";
import { fileURLToPath } from 'url';
import { routes, serverOptions, config as appConfig } from './config/config.js';
import { requestID } from './middlewares/requestID.js';
import { authGuard } from './middlewares/auth.js';
import { forward } from './proxy.js';
import http from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:4000",
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5502",
            "http://127.0.0.1:5503",
        ],
        credentials: true,
    }
})
io.on("connection", (socket) => {
    console.log("[ws] client connected: ", socket.id);

    socket.on("join-show", (showId) => {
        if (!showId) return;
        socket.join(`show:${showId}`);
        console.log(`[ws] socket ${socket.id} joined room show:${showId}`);
    });
    socket.on("disconnect", () => {
        console.log("[ws] client disconnected:", socket.id);
    });
})
app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(rateLimit(serverOptions.rateLimit));
app.use(requestID);
const eventsClient = axios.create({
    baseURL: process.env.EVENT_SVC_URL || "http://localhost:4102",
    timeout: 10000, // ⬅️ chỉ chờ tối đa 5s
});

app.use('/frontend', express.static(path.join(projectRoot, 'frontend')));

app.post("/internal/ws/seat-updated", (req, res) => {
    const { showId, seats, status, holdId, expiresAt } = req.body || {};

    if (!showId || !Array.isArray(seats) || !status) {
        return res.status(400).json({
            error: { code: "BAD_WS_PAYLOAD", message: "Missing showId/seats/status" },
        });
    }

    console.log("[ws] broadcasting seat-updated:", { showId, seats, status });

    io.to(`show:${showId}`).emit("seat-updated", {
        showId,
        seats,
        status,    // "HELD" | "RELEASED"
        holdId: holdId || null,
        expiresAt: expiresAt || null,
    });

    res.json({ ok: true });
});

app.use((req, res, next) => {
    // Ignore Chrome DevTools, favicon, and other browser requests
    if (
        req.path.startsWith('/.well-known') ||
        req.path === '/favicon.ico' ||
        req.path === '/robots.txt'
    ) {
        return res.status(404).end();
    }
    next();
});

// Health của gateway
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'gateway', time: new Date().toISOString() });
});

// Chọn route có prefix dài nhất
function matchRoute(pathname) {
    return (
        routes
            .filter(r => pathname.startsWith(r.prefix))
            .sort((a, b) => b.prefix.length - a.prefix.length)[0] || null
    );
}

// Handler chính
app.use((req, res) => {
    const route = matchRoute(req.path);
    console.log('[gateway]', req.method, req.path, '→ route:', route?.prefix || 'NO_MATCH'); // debug

    if (!route) {
        console.error('[gateway] No route found for:', req.path);
        return res.status(404).json({
            error: { code: 'NO_ROUTE', message: `No matching route for ${req.path}` }
        });
    }
    authGuard(route)(req, res, () =>
        forward(req, res, route, serverOptions.timeoutMs)
    );
});

const PORT = appConfig.port || 4000;
server.listen(PORT, () => {
    console.log(`[gateway] listening on ${PORT}`);
});
