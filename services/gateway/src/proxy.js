import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Forward request tới service đích.
 * Hỗ trợ:
 *  - route.rewrite: thay prefix (vd: /api/auth -> /auth)
 *  - Gateway có/không parse JSON body
 */
export function forward(req, res, route, timeoutMs = 5000) {
    try {
        if (!route || !route.target) {
            return res.status(502).json({
                error: { code: 'BAD_TARGET', message: 'Invalid route target' }
            });
        }

        // --------- TÍNH PATH ĐÍCH (có rewrite nếu cấu hình) ----------
        // VD: original = /api/auth/register?x=1
        const originalPath = req.originalUrl || req.url || '/';

        // Nếu có route.rewrite → thay thế prefix; ngược lại giữ nguyên
        // Ví dụ:
        //  route.prefix  = '/api/auth'
        //  route.rewrite = '/auth'
        // => /api/auth/register?x=1 -> /auth/register?x=1
        const rewrittenPath = (typeof route.rewrite === 'string')
            ? originalPath.replace(route.prefix, route.rewrite)
            : originalPath;

        // targetUrl sẽ là: route.target + rewrittenPath
        // route.target phải là một absolute URL (vd http://localhost:4101)
        const targetUrl = new URL(rewrittenPath, route.target);
        const client = targetUrl.protocol === 'https:' ? https : http;

        // --------- CHUẨN HOÁ HEADERS ----------
        const headers = { ...req.headers };

        // Bỏ hop-by-hop headers (theo RFC 7230)
        delete headers['host'];
        delete headers['connection'];
        delete headers['keep-alive'];
        delete headers['proxy-authenticate'];
        delete headers['proxy-authorization'];
        delete headers['te'];
        delete headers['trailers'];
        delete headers['transfer-encoding'];
        delete headers['upgrade'];
        delete headers['content-length']; // sẽ set lại khi cần

        // X-Forwarded-* (giữ thêm thông tin client)
        const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString();
        const xfHost = req.headers['x-forwarded-host'] || req.headers['host'];
        headers['x-forwarded-proto'] = proto;
        if (xfHost) headers['x-forwarded-host'] = xfHost;

        // Request ID / User info (nếu gateway đã attach)
        if (req.requestId) headers['x-request-id'] = req.requestId;
        if (req.user) {
            headers['x-user-id'] = req.user.id;
            headers['x-user-email'] = req.user.email || '';
            headers['x-user-roles'] = (req.user.roles || []).join(',');
        }

        // Host header phải là host của upstream
        headers['host'] = targetUrl.host;

        // Không nén body trả về, để tránh phải tự unzip khi piping
        headers['accept-encoding'] = 'identity';

        // --------- BODY (nếu gateway đã express.json()) ----------
        const method = (req.method || 'GET').toUpperCase();
        const canHaveBody = !['GET', 'HEAD'].includes(method);
        const contentType =
            (headers['content-type'] || headers['Content-Type'] || '').toString().toLowerCase();
        const isJSON = contentType.includes('application/json');

        let bodyStr = null;
        if (canHaveBody && isJSON && typeof req.body !== 'undefined' && req.body !== null) {
            // Gateway đã parse JSON → serialize lại và set content-length
            bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            headers['content-length'] = Buffer.byteLength(bodyStr).toString();
        } else {
            // Pipe stream hoặc không có body
            delete headers['content-length'];
        }

        // --------- TẠO REQUEST LÊN UPSTREAM ----------
        const options = {
            method,
            headers,
            timeout: timeoutMs,
        };

        const proxyReq = client.request(targetUrl, options, (proxyRes) => {
            // Sao chép status + headers
            res.status(proxyRes.statusCode || 502);
            for (const [k, v] of Object.entries(proxyRes.headers || {})) {
                if (typeof v !== 'undefined') res.setHeader(k, v);
            }
            proxyRes.pipe(res);
        });

        // Timeout ở socket
        proxyReq.on('timeout', () => proxyReq.destroy(new Error('GATEWAY_TIMEOUT')));

        // Client hủy giữa chừng
        req.on('aborted', () => proxyReq.destroy(new Error('CLIENT_ABORTED')));

        proxyReq.on('error', (err) => {
            const code =
                err.message === 'GATEWAY_TIMEOUT' ? 504 :
                    err.message === 'CLIENT_ABORTED' ? 499 : 502;

            const label =
                err.message === 'GATEWAY_TIMEOUT' ? 'GATEWAY_TIMEOUT' :
                    err.message === 'CLIENT_ABORTED' ? 'CLIENT_ABORTED' : 'BAD_GATEWAY';

            if (!res.headersSent) {
                res.status(code).json({ error: { code: label, message: err.message } });
            }
        });

        // --------- GỬI BODY ----------
        if (bodyStr !== null) {
            proxyReq.write(bodyStr);
            proxyReq.end();
        } else if (canHaveBody && req.readable) {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }
    } catch (e) {
        if (!res.headersSent) {
            res.status(500).json({ error: { code: 'PROXY_URL_ERROR', message: e.message } });
        }
    }
}
