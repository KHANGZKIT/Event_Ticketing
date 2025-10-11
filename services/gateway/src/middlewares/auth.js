import jwt from 'jsonwebtoken';

// Bảo vệ route theo cấu hình (auth, roles)
export function authGuard(route) {
    return (req, res, next) => {
        if (!route.auth) return next(); // public route

        const h = req.headers.authorization || '';
        if (!h.startsWith('Bearer ')) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
        }

        try {
            const token = h.slice(7);
            const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

            // Truyền context người dùng xuống service sau
            req.user = {
                id: payload.sub,
                email: payload.email,
                roles: payload.roles || [],
            };

            // Nếu route yêu cầu role thì kiểm tra
            if (route.roles?.length) {
                const ok = (req.user.roles || []).some(r => route.roles.includes(r));
                if (!ok) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
            }
            next();
        } catch {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid/expired token' } });
        }
    };
}
