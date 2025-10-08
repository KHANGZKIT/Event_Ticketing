import { loginSchema, registerSchema } from "./auth.schema.js";
import { hash, compare } from "../../utils/password.js"
import { prisma } from "@app/db";
import jwt from 'jsonwebtoken';


export async function register(body) {
    const { email, password, fullName } = registerSchema.parse(body);
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

    return user;

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
    if (!userId) {
        const e = new Error('Unauthorized'); e.status = 401; throw e;
    }
    return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, createdAt: true }
    });
}
