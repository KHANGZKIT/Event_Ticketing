import { z } from 'zod';

export const JoinWaitlistSchema = z.object({
    showId: z.string().uuid(),
    seatCount: z.number().int().min(1).max(10).default(1),
});

export const AcceptOfferSchema = z.object({
    showId: z.string().uuid(),
});
