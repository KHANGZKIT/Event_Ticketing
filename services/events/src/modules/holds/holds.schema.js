import { z } from 'zod';

export const CreateHoldSchema = z.object({
    showId: z.string().uuid(),
    seats: z.array(z.string().min(1)).min(1)
});