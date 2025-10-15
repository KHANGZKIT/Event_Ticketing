export function requireAuth(req, res, next) {
    const uid = req.headers['x-user-id'];
    if (!uid)
        return res.status(401).json({ error: { code: 401, message: 'Unauthenticated' } });
    req.user = { id: String(uid), roles: String(req.headers['x-user-role'] || '').split(',').filter(Boolean) };
    next();
}