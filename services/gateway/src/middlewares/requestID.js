import { randomUUID } from 'node:crypto';

export const requestID = (req, res, next) => {
    const ridFromUpstream = req.headers['x-request-id'];
    const rid = typeof ridFromUpstream === 'string' && ridFromUpstream.trim()
        ? ridFromUpstream.trim()
        : randomUUID();

    req.requestId = rid;
    res.setHeader('X-Request-Id', rid);
    next();
}  // Tao id cho moi request de tracking
