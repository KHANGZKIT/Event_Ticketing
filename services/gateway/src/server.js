import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { routes, serverOptions, config as appConfig } from './config/config.js';
import { requestID } from './middlewares/requestID.js';
import { authGuard } from './middlewares/auth.js';
import { forward } from './proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ 
    origin: true,          
    credentials: true, }));
app.use(rateLimit(serverOptions.rateLimit));
app.use(requestID);

// Serve static files from frontend directory
app.use('/frontend', express.static(path.join(projectRoot, 'frontend')));

// Handle browser/system requests silently (no logs)
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

    // authGuard dạng currying: quyết định có yêu cầu auth dựa trên route (tự bạn define)
    authGuard(route)(req, res, () =>
        forward(req, res, route, serverOptions.timeoutMs)
    );
});

const PORT = appConfig.port || 4000;
app.listen(PORT, () => {
    console.log(`[gateway] listening on ${PORT}`);
});
