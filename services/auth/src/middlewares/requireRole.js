import { prisma } from "@app/db";

export function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing user' } });
        }

        const has = await prisma.userRole.findFirst({
            where: { userId: req.userId, role: { name: { in: roles } } },
            include: { role: true }
        })

        if (!has) {
            return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No access role' } });
        }
        next();
    };
}