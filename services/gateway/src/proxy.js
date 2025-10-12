import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Forward request tới service đích.
 * - Hỗ trợ cả 2 trường hợp:
 *   (1) Gateway KHÔNG parse body (khuyên dùng) -> stream pipe trực tiếp
 *   (2) Gateway ĐÃ parse JSON bằng express.json() -> serialize lại body và set content-length
 */
export function forward(req, res, route, timeoutMs = 5000) {
    try {
        if (!route || !route.target) {
            return res.status(502).json({
                error: { code: 'BAD_TARGET', message: 'Invalid route target' }
            });
        }

        // Nếu backend không muốn prefix /api/... thì strip ở đây (tùy config):
        // const stripped = req.originalUrl.replace(route.prefix, '') || '/';
        // const pathToUse = stripped.startsWith('/') ? stripped : `/${stripped}`;
        const pathToUse = req.originalUrl; // giữ nguyên nếu backend đã handle prefix

        const targetUrl = new URL(pathToUse, route.target); // base phải là absolute
        const client = targetUrl.protocol === 'https:' ? https : http;

        // --- Chuẩn hoá headers ---
        const headers = { ...req.headers };

        // Bỏ hop-by-hop headers
        delete headers['host'];
        delete headers['connection'];
        delete headers['keep-alive'];
        delete headers['transfer-encoding'];
        delete headers['content-length']; // sẽ set lại nếu cần

        // Set request id / user info nếu có
        headers['x-request-id'] = req.requestId || headers['x-request-id'];
        if (req.user) {
            headers['x-user-id'] = req.user.id;
            headers['x-user-email'] = req.user.email || '';
            headers['x-user-roles'] = (req.user.roles || []).join(',');
        }

        // Đảm bảo host đúng về service đích
        headers['host'] = targetUrl.host;

        // --- Chuẩn bị body nếu gateway đã parse JSON ---
        const method = (req.method || 'GET').toUpperCase();
        const canHaveBody = !['GET', 'HEAD'].includes(method);
        const contentType = (headers['content-type'] || headers['Content-Type'] || '').toString();
        const isJSON = contentType.includes('application/json');

        let bodyStr = null;
        if (canHaveBody && isJSON && typeof req.body !== 'undefined' && req.body !== null) {
            // Nếu gateway đã dùng express.json(), serialize lại
            bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            headers['content-length'] = Buffer.byteLength(bodyStr).toString();
        } else {
            // Trường hợp sẽ pipe stream hoặc không có body
            delete headers['content-length'];
        }

        const options = { method, headers, timeout: timeoutMs };

        const proxyReq = client.request(targetUrl, options, (proxyRes) => {
            // Copy status + headers trả về
            res.status(proxyRes.statusCode || 502);
            for (const [k, v] of Object.entries(proxyRes.headers || {})) {
                if (typeof v !== 'undefined') res.setHeader(k, v);
            }
            proxyRes.pipe(res);
        });

        // Timeout ở tầng socket
        proxyReq.on('timeout', () => proxyReq.destroy(new Error('GATEWAY_TIMEOUT')));

        // Nếu client huỷ request giữa chừng -> huỷ luôn proxyReq
        req.on('aborted', () => proxyReq.destroy(new Error('CLIENT_ABORTED')));

        proxyReq.on('error', (err) => {
            const code =
                err.message === 'GATEWAY_TIMEOUT' ? 504 :
                    err.message === 'CLIENT_ABORTED' ? 499 : // 499 (ngầm định) – client huỷ
                        502;

            const label =
                err.message === 'GATEWAY_TIMEOUT' ? 'GATEWAY_TIMEOUT' :
                    err.message === 'CLIENT_ABORTED' ? 'CLIENT_ABORTED' :
                        'BAD_GATEWAY';

            // Tránh double-write nếu response đã gửi xong
            if (res.headersSent) return;
            res.status(code).json({ error: { code: label, message: err.message } });
        });

        // --- Gửi body ---
        if (bodyStr !== null) {
            // Đã serialize lại (gateway dùng express.json())
            proxyReq.write(bodyStr);
            proxyReq.end();
        } else if (canHaveBody && req.readable) {
            // Chưa parse ở gateway -> pipe stream gốc
            req.pipe(proxyReq);
        } else {
            // Không có body
            proxyReq.end();
        }
    } catch (e) {
        if (!res.headersSent) {
            res.status(500).json({ error: { code: 'PROXY_URL_ERROR', message: e.message } });
        }
    }
}
