import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { routes, serverOptions, config as appConfig } from './config/config.js';
import { requestID } from './middlewares/requestID.js';
import { authGuard } from './middlewares/auth.js';
import { forward } from './proxy.js';

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit(serverOptions.rateLimit));
app.use(requestID);

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
    console.log('route:', route); // debug

    if (!route) {
        return res.status(404).json({
            error: { code: 'NO_ROUTE', message: 'No matching route' }
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
