import { loginSchema, registerSchema } from "./auth.schema.js";
import { hash, compare } from "../../utils/password.js"
import { prisma } from "@app/db";
import jwt from 'jsonwebtoken';


export async function register(body) {
    const { email, password, fullName } = registerSchema.parse(body);

    if (email === process.env.ADMIN_EMAIL) {
        const e = new Error('This email is reserved');
        e.status = 403;
        throw e;
    }

    const existed = await prisma.user.findUnique({ where: { email } });
    if (existed) {
        const error = new Error('Email already exists');
        error.status = 409;
        throw error;
    }

    const user = await prisma.user.create({
        data: { email, passwordHash: await hash(password), fullName },
        select: { id: true, email: true, fullName: true, createdAt: true },
    });

    const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    if (userRole) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: userRole.id } });
    }

    return { id: user.id, email: user.email, fullName: user.fullName, createdAt: user.createdAt };

}

export async function login(body) {
    const { email, password } = loginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await compare(password, user.passwordHash))) {
        const e = new Error('Invalid email or password'); e.status = 401; throw e;
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d' });
    return { token };
}

export async function getMe(userId) {
    if (!userId) { const e = new Error('Unauthorized'); e.status = 401; throw e; }

    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
            roles: {
                select: {
                    role: { select: { name: true } }
                }
            }
        }
    });

    if (!u) { const e = new Error('User not found'); e.status = 404; throw e; }

    const roleNames = u.roles.map(r => r.role.name);

    return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        createdAt: u.createdAt,
        roles: roleNames,
        isAdmin: roleNames.includes('admin'),
        isStaff: roleNames.includes('staff'),
        isUser: roleNames.includes('user'),
    };
}

