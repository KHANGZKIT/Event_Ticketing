import { prisma } from "@app/db";
import { CreatePaymentSchema } from "./payments.schema.js";
import { MoMoProvider } from "./providers/momo.provider.js";
import { VNPayProvider } from "./providers/vnpay.provider.js";
import { getPaymentConfig } from "../../config/payment.config.js";

/**
 * Get payment provider instance
 */
function getProvider(providerName) {
    const config = getPaymentConfig(providerName);

    switch (providerName) {
        case 'momo':
            return new MoMoProvider(config);
        case 'vnpay':
            return new VNPayProvider(config);
        default:
            throw new Error(`Unsupported payment provider: ${providerName}`);
    }
}

async function applyPaymentStatus(payment, parsedData) {
    const paymentStatus = parsedData.status === 'succeeded' ? 'succeeded' : 'failed';

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: payment.id },
            data: {
                status: paymentStatus,
                providerRef: parsedData.providerRef || parsedData.transactionId || payment.providerRef,
                paidAt: paymentStatus === 'succeeded'
                    ? (parsedData.paidAt || new Date())
                    : null,
                updatedAt: new Date()
            }
        });

        if (paymentStatus === 'succeeded') {
            await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    status: 'paid',
                    updatedAt: new Date()
                }
            });

            const existingTickets = await tx.ticket.findMany({
                where: { orderId: payment.orderId }
            });

            if (existingTickets.length === 0) {
                console.warn('[Payment] Order paid but no tickets found. Order should have tickets from checkout.');
            }
        } else {
            await tx.order.update({
                where: { id: payment.orderId },
                data: {
                    status: 'failed',
                    updatedAt: new Date()
                }
            });
        }
    });

    return paymentStatus;
}

/**
 * Create payment and return payment URL
 */
export async function createPayment(userId, body) {
    const { orderId, provider, returnUrl, cancelUrl } = CreatePaymentSchema.parse(body);

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            show: {
                include: {
                    event: true
                }
            }
        }
    });

    if (!order) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }

    if (order.userId !== userId) {
        const err = new Error('Forbidden: Order does not belong to user');
        err.status = 403;
        throw err;
    }

    if (order.status !== 'pending') {
        const err = new Error(`Order status is ${order.status}, cannot create payment`);
        err.status = 400;
        throw err;
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
        where: { orderId }
    });

    if (existingPayment && existingPayment.status === 'succeeded') {
        const err = new Error('Payment already succeeded');
        err.status = 400;
        throw err;
    }

    // Get payment provider
    const paymentProvider = getProvider(provider);

    // Create payment record
    const payment = await prisma.payment.upsert({
        where: { orderId },
        create: {
            orderId,
            provider,
            amount: order.amount,
            currency: order.currency || 'VND',
            status: 'init'
        },
        update: {
            provider,
            status: 'init',
            updatedAt: new Date()
        }
    });

    // Generate payment URL

    // Đơn giản hóa orderInfo, không cần xóa gạch ngang
    // vì vnpay.provider sẽ tự đồng nhất vnp_TxnRef và vnp_OrderInfo
    const orderInfo = `Thanh toan cho don hang ${orderId}`;

    const notifyUrl = `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/webhooks/${provider}`;

    const paymentResult = await paymentProvider.createPaymentUrl({
        orderId, // Truyền orderId (UUID) gốc
        amount: order.amount,
        orderInfo, // Truyền orderInfo (đã đơn giản hóa)
        notifyUrl
        // Không truyền returnUrl, để vnpay.provider tự lấy
    });

    // Update payment with provider reference
    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            // Lưu lại vnp_TxnRef (đã xóa gạch ngang)
            providerRef: paymentResult.requestId
        }
    });

    return {
        paymentId: payment.id,
        paymentUrl: paymentResult.paymentUrl,
        qrCode: paymentResult.qrCode || null,
        provider,
        orderId
    };
}

/**
 * Process webhook from payment provider
 */
export async function processWebhook(providerName, webhookData) {
    console.log('[processWebhook] Provider:', providerName);
    console.log('[processWebhook] Webhook data:', JSON.stringify(webhookData, null, 2));

    const provider = getProvider(providerName);

    // Verify signature
    const signature = webhookData.signature || webhookData.vnp_SecureHash;
    console.log('[processWebhook] Received signature:', signature);

    if (!provider.verifySignature(webhookData, signature)) {
        const err = new Error('Invalid webhook signature');
        err.status = 400;
        throw err;
    }

    // Parse webhook data
    const parsedData = provider.parseWebhookData(webhookData);

    // SỬA LỖI 3: Tìm payment bằng providerRef (là vnp_TxnRef)
    // vì orderId trong CSDL là UUID (có gạch ngang)
    // còn providerRef/vnp_TxnRef là (không có gạch ngang)
    const payment = await prisma.payment.findFirst({
        where: {
            providerRef: parsedData.providerRef, // Tìm bằng providerRef
            provider: providerName
        },
        include: {
            order: true
        }
    });

    if (!payment) {
        const err = new Error(`Payment not found for providerRef: ${parsedData.providerRef}`);
        err.status = 404;
        throw err;
    }

    // Update payment status
    const paymentStatus = await applyPaymentStatus(payment, parsedData);

    return {
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId, // Trả về orderId GỐC (có gạch ngang)
        status: paymentStatus
    };
}

// ... (Các hàm còn lại giữ nguyên) ...

export async function syncPaymentStatusFromProvider(providerName, orderId) {
    if (!orderId) throw new Error('orderId is required');

    const payment = await prisma.payment.findFirst({
        where: { orderId, provider: providerName }
    });
    if (!payment) {
        const err = new Error('Payment not found');
        err.status = 404;
        throw err;
    }
    if (payment.status === 'succeeded') {
        return { success: true, status: payment.status, orderId };
    }

    if (providerName !== 'momo') {
        return { success: false, status: payment.status, orderId };
    }

    const provider = getProvider(providerName);
    if (typeof provider.queryTransaction !== 'function') {
        return { success: false, status: payment.status, orderId };
    }

    const queryData = await provider.queryTransaction(orderId);
    const status = await applyPaymentStatus(payment, queryData);
    return { success: true, status, orderId };
}

/**
 * Get payment status
 */
export async function getPaymentStatus(orderId, userId) {
    let order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            payment: true
        }
    });

    if (!order) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
    }

    if (order.userId !== userId) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }

    // Nếu order vẫn pending nhưng provider đã báo thành công, thử sync trực tiếp
    if (order.status === 'pending' && order.payment && order.payment.provider === 'momo' && order.payment.status !== 'succeeded') {
        try {
            const result = await syncPaymentStatusFromProvider('momo', orderId);
            if (result?.status === 'succeeded' || result?.status === 'failed') {
                order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: { payment: true }
                });
            }
        } catch (err) {
            console.warn('[payments.getStatus] sync fallback failed:', err.message);
        }
    }

    return {
        orderId: order.id,
        orderStatus: order.status,
        payment: order.payment ? {
            id: order.payment.id,
            provider: order.payment.provider,
            status: order.payment.status,
            amount: order.payment.amount,
            currency: order.payment.currency,
            paidAt: order.payment.paidAt
        } : null
    };
}