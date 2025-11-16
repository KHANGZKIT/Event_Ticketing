import { z } from 'zod';

export const CreatePaymentSchema = z.object({
    orderId: z.string().uuid(),
    provider: z.enum(['momo', 'vnpay']),
    returnUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional()
});

export const PaymentWebhookSchema = z.object({
    // MoMo webhook fields
    partnerCode: z.string().optional(),
    orderId: z.string().optional(),
    requestId: z.string().optional(),
    amount: z.number().optional(),
    orderInfo: z.string().optional(),
    orderType: z.string().optional(),
    transId: z.number().optional(),
    resultCode: z.number().optional(),
    message: z.string().optional(),
    payType: z.string().optional(),
    responseTime: z.number().optional(),
    extraData: z.string().optional(),
    signature: z.string().optional(),
    
    // VNPay webhook fields
    vnp_TmnCode: z.string().optional(),
    vnp_Amount: z.string().optional(),
    vnp_BankCode: z.string().optional(),
    vnp_BankTranNo: z.string().optional(),
    vnp_CardType: z.string().optional(),
    vnp_PayDate: z.string().optional(),
    vnp_TransactionNo: z.string().optional(),
    vnp_TransactionStatus: z.string().optional(),
    vnp_TxnRef: z.string().optional(),
    vnp_SecureHash: z.string().optional()
}).passthrough(); // Allow additional fields

