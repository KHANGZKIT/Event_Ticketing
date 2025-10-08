import jwt from 'jsonwebtoken';

export function authGuard(req, res, next) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        console.error('[authGuard] Missing Authorization header');
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    }

    try {
        const token = authHeader.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        console.log('[authGuard] payload =', payload);
        req.userId = payload.sub;
        next();
    } catch (error) {
        console.error('[authGuard] verify error:', error);
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

}