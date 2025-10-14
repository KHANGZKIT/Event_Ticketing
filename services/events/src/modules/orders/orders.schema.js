import { z } from 'zod'
export const CheckoutSchema = z.object({ 
    holdId: z.string().uuid()
})