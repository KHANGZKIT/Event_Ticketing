import http from 'http';
import https from 'https';
import { URL } from 'url';

// Forward request tới service đích
export function forward(req, res, route, timeoutMs = 5000) {
    try {
        if (!route || !route.target) {
            return res.status(502).json({
                error: { code: 'BAD_TARGET', message: 'Invalid route target' }
            });
        }

        // Nếu backend không muốn prefix /api/... thì strip prefix ở đây:
        // const stripped = req.originalUrl.replace(route.prefix, '') || '/';
        // const pathToUse = stripped.startsWith('/') ? stripped : `/${stripped}`;
        const pathToUse = req.originalUrl; // giữ nguyên nếu backend đã handle prefix

        const targetUrl = new URL(pathToUse, route.target); // base phải là absolute
        const client = targetUrl.protocol === 'https:' ? https : http;

        // Chuẩn hoá headers (bỏ hop-by-hop headers)
        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['connection'];
        delete headers['keep-alive'];
        delete headers['transfer-encoding'];
        delete headers['content-length'];

        headers['x-request-id'] = req.requestId || headers['x-request-id'];
        if (req.user) {
            headers['x-user-id'] = req.user.id;
            headers['x-user-email'] = req.user.email || '';
            headers['x-user-roles'] = (req.user.roles || []).join(',');
        }

        const options = { method: req.method, headers, timeout: timeoutMs };

        const proxyReq = client.request(targetUrl, options, (proxyRes) => {
            res.status(proxyRes.statusCode || 502);
            for (const [k, v] of Object.entries(proxyRes.headers || {})) {
                if (typeof v !== 'undefined') res.setHeader(k, v);
            }
            proxyRes.pipe(res);
        });

        proxyReq.on('timeout', () => proxyReq.destroy(new Error('GATEWAY_TIMEOUT')));
        proxyReq.on('error', (err) => {
            res.status(err.message === 'GATEWAY_TIMEOUT' ? 504 : 502).json({
                error: {
                    code: err.message === 'GATEWAY_TIMEOUT' ? 'GATEWAY_TIMEOUT' : 'BAD_GATEWAY',
                    message: err.message
                }
            });
        });

        if (req.readable) req.pipe(proxyReq);
        else proxyReq.end();

    } catch (e) {
        res.status(500).json({ error: { code: 'PROXY_URL_ERROR', message: e.message } });
    }
}
