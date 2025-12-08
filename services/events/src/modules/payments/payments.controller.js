import * as svc from './payments.service.js';

export async function createPayment(req, res, next) {
    try {
        const result = await svc.createPayment(req.userId, req.body);
        res.status(201).json(result);
    } catch (e) {
        next(e);
    }
}

export async function handleWebhook(req, res, next) {
    try {
        const provider = req.params.provider;
        const result = await svc.processWebhook(provider, req.body);
        res.status(200).json(result);
    } catch (e) {
        next(e);
    }
}

export async function getPaymentStatus(req, res, next) {
    try {
        const { orderId } = req.params;
        console.log('[getPaymentStatus] orderId =', orderId, 'userId =', req.userId);
        const result = await svc.getPaymentStatus(orderId, req.userId);
        console.log('[getPaymentStatus] result =', result);
        res.json(result);
    } catch (e) {
        console.error('[getPaymentStatus] error:', e.status, e.message);
        next(e);
    }
}

/**
 * Handle payment return callback (GET request from payment gateway redirect)
 * Supports both MoMo and VNPay
 */
export async function handleReturnCallback(req, res, next) {
    try {
        const provider = req.params.provider;
        const callbackData = req.query;

        console.log('[Payment Return] Provider:', provider);
        console.log('[Payment Return] Callback data keys:', Object.keys(callbackData));
        console.log('[Payment Return] Callback data:', JSON.stringify(callbackData, null, 2));

        // For VNPay: has query params with payment info, process immediately
        // For MoMo: usually no query params, webhook handles it, but we can check status
        if (provider === 'vnpay' && callbackData.vnp_TxnRef) {
            // VNPay sends payment data in query params, process it
            const result = await svc.processWebhook(provider, callbackData);
            const orderId = result.orderId;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            return res.redirect(`${frontendUrl}/frontend/PurchaseUI/payment-return.html?orderId=${orderId}`);
        } else if (provider === 'momo') {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            let orderId = callbackData.orderId || '';

            // Trong môi trường dev chúng ta ít khi nhận được webhook từ MoMo.
            // Nếu redirect callback có chứa đủ dữ liệu, xử lý nó như một webhook.
            const hasMoMoParams = typeof callbackData.resultCode !== 'undefined' && callbackData.signature;
            if (hasMoMoParams) {
                try {
                    const result = await svc.processWebhook(provider, callbackData);
                    orderId = orderId || result.orderId;
                } catch (err) {
                    console.warn('[payments.return] MoMo callback processing failed:', err.message);
                    // Tiếp tục redirect để FE retry polling trạng thái
                }
            } else if (orderId) {
                try {
                    await svc.syncPaymentStatusFromProvider('momo', orderId);
                } catch (err) {
                    console.warn('[payments.return] MoMo query fallback failed:', err.message);
                }
            }

            return res.redirect(`${frontendUrl}/frontend/PurchaseUI/payment-return.html${orderId ? `?orderId=${orderId}` : ''}`);
        } else {
            // Unknown provider or no data
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
            return res.redirect(`${frontendUrl}/frontend/PurchaseUI/payment-return.html`);
        }
    } catch (e) {
        // If error, still redirect but with error info
        console.error('[Payment Return] Error:', e.message);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
        const orderId = req.query.vnp_TxnRef || req.query.orderId || '';
        res.redirect(`${frontendUrl}/frontend/PurchaseUI/payment-return.html?orderId=${orderId}&error=1`);
    }
}

