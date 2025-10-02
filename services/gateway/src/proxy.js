import http from 'http';
import https from 'https';
import { URL } from 'url';

export const forward = (req, res, route) => {
    const targetUrl = new URL(req.originalUrl, route.target);
    const client = targetUrl.protocol === 'https:' ? https : http; // Chon giao thuc phu hop

    //Headers
    const headers = { ...req.headers }; // Copy headers tu request goc
    Object.keys(headers).forEach(h => { if (h.startsWith('x-user-')) delete headers[h]; });
    headers['x-request-id'] = req.requestId;
    if (req.user) {
        headers['x-user-id'] = req.user.id;
        headers['x-user-roles'] = (req.user.roles || []).join(',');
    }

    // 2) Tạo request tới service
    const options = {
        method: req.method,
        headers,
        timeout: 5000
    };
    const started = Date.now();

    const proxyReq = client.request(targetUrl, options, (proxyRes) => {
        // 3) Copy status + headers trả về
        res.status(proxyRes.statusCode || 502);
        const hopByHop = new Set(['connection', 'transfer-encoding', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade']);
        for (const [k, v] of Object.entries(proxyRes.headers)) {
            if (v !== undefined && !hopByHop.has(k.toLowerCase())) res.setHeader(k, v);
        }
        proxyRes.pipe(res);
        proxyRes.on('end', () => {
            // console.log(`[GW] rid=${req.requestId} ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode} ${Date.now()-started}ms`);
        });
    });

    proxyReq.on('timeout', () => proxyReq.destroy(new Error('GATEWAY_TIMEOUT')));
    proxyReq.on('error', (err) => {
        const code = err.message === 'GATEWAY_TIMEOUT' ? 504 : 502;
        res.status(code).json({ error: { code: code === 504 ? 'GATEWAY_TIMEOUT' : 'BAD_GATEWAY', message: err.message, traceId: req.requestId } });
    });

    // 4) Stream body từ client sang service
    if (req.readableEnded) proxyReq.end();
    else req.pipe(proxyReq);
}


