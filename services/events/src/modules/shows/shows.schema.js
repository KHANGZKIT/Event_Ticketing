import { z } from 'zod';
export const CreateShowSchema = z.object({
    eventId: z.string().uuid(),
    startsAt: z.string().datetime(),
    venue: z.string().optional(),
    seatMapId: z.string().min(1).optional()
});
export const UpdateShowSchema = CreateShowSchema.partial();
