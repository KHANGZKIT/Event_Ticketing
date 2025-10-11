import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2).max(120).optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

