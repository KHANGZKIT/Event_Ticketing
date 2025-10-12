import { z } from 'zod';

export const CreateEventSchema = z.object({
    name: z.string().min(1),
    city: z.string().optional(),
    startsAt: z.string().datetime().optional(),
    cover: z.string().url().optional()
});

export const UpdateEventSchema = CreateEventSchema.partial();
