// middlewares/requireRole.js
export function requireRole(...allowed) {
    const allow = new Set(allowed); // ví dụ: new Set(['admin','staff'])
    return (req, res, next) => {
        if (!req.userId) {
            return res.status(401).json({ error: { code: 401, message: 'Unauthorized' } });
        }
        const roles = req.userRoles || [];
        const ok = roles.some(r => allow.has(r));
        if (!ok) {
            return res.status(403).json({ error: { code: 403, message: 'Forbidden' } });
        }
        next();
    };
}
