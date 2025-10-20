import { z } from 'zod';

export const CheckinFromQRSchema = z.object({
    tid: z.string().uuid('Invalid ticket id'),
    sig: z.string().min(10, 'Invalid signature'),
});

