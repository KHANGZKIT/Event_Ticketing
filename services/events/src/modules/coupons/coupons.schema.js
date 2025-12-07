import { z } from 'zod';

export const CreateCouponSchema = z.object({
    code: z.string().min(3).max(20),
    discountType: z.enum(['percent', 'fixed']),
    discountValue: z.number().min(0),
    minOrderValue: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).optional(),
    usageLimit: z.number().min(1).optional(),
    expiresAt: z.string().datetime().optional()
});

export const UpdateCouponSchema = CreateCouponSchema.partial();
