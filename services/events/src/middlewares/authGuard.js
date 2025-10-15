import jwt from 'jsonwebtoken';
import { prisma } from '@app/db';

export async function authGuard(req, res, next) {
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
        // Lấy user + roles từ DB (RBAC theo dữ liệu thật)
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                roles: {
                    select: { role: { select: { name: true } } } // -> [{ role: { name: 'admin' }}, ...]
                }
            }
        });

        if (!user) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
        }

        req.userId = user.id;
        req.userRoles = (user.roles || []).map(ur => ur.role.name); // ['admin','staff',...]
        return next();
    } catch (error) {
        console.error('[authGuard] verify error:', error);
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

}