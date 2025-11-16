import crypto from 'crypto';
import { Buffer } from 'buffer';
import { BasePaymentProvider } from './base.provider.js';

/**
 * MoMo Payment Provider
 * Documentation: https://developers.momo.vn/
 */
export class MoMoProvider extends BasePaymentProvider {
    constructor(config) {
        super(config);
        this.partnerCode = config.partnerCode;
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;
        this.environment = config.environment || 'sandbox';
        this.partnerName = config.partnerName || 'Event Ticketing';
        this.storeId = config.storeId || 'EventTicketingStore';
        this.returnUrl = config.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment/return`;
        
        // MoMo API endpoints
        this.baseUrl = this.environment === 'production'
            ? 'https://payment.momo.vn/v2/gateway/api/create'
            : 'https://test-payment.momo.vn/v2/gateway/api/create';
        this.queryUrl = this.environment === 'production'
            ? 'https://payment.momo.vn/v2/gateway/api/query'
            : 'https://test-payment.momo.vn/v2/gateway/api/query';
    }

    /**
     * Generate MoMo signature
     * Format: accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
     * Reference: https://github.com/momo-wallet/payment/blob/master/nodejs/CollectionLink.js
     */
    generateSignature(params) {
        const {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            requestType,
            extraData = ''
        } = params;

        // Signature format theo official MoMo documentation
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');
    }

    /**
     * Create payment URL
     * Reference: https://github.com/momo-wallet/payment/blob/master/nodejs/CollectionLink.js
     */
    async createPaymentUrl({ orderId, amount, orderInfo, returnUrl, notifyUrl, extraData = '' }) {
        // RequestId format: partnerCode + timestamp (theo official example)
        const requestId = `${this.partnerCode}${new Date().getTime()}`;
        const redirectUrl = returnUrl || this.returnUrl;
        const ipnUrl = notifyUrl || `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/webhooks/momo`;
        const requestType = 'payWithMethod'; // Theo official example
        
        // Prepare signature params (theo đúng thứ tự trong official example)
        const signatureParams = {
            accessKey: this.accessKey,
            amount: amount.toString(),
            extraData,
            ipnUrl,
            orderId,
            orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
            partnerCode: this.partnerCode,
            redirectUrl,
            requestId,
            requestType
        };

        // Generate signature
        const signature = this.generateSignature(signatureParams);
        
        // Request body theo official format
        const requestData = {
            partnerCode: this.partnerCode,
            partnerName: this.partnerName,
            storeId: this.storeId,
            requestId,
            amount: amount.toString(),
            orderId,
            orderInfo: signatureParams.orderInfo,
            redirectUrl,
            ipnUrl,
            lang: 'vi',
            requestType,
            autoCapture: true,
            extraData,
            orderGroupId: '',
            signature
        };

        try {
            // Call MoMo API
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(requestData)).toString()
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.resultCode === 0) {
                return {
                    paymentUrl: result.payUrl,
                    requestId: requestId,
                    qrCode: result.qrCode || null,
                    deeplink: result.deeplink || null
                };
            } else {
                throw new Error(`MoMo API error (${result.resultCode}): ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('[MoMo] Create payment error:', error);
            throw new Error(`Failed to create MoMo payment: ${error.message}`);
        }
    }

    /**
     * Verify webhook signature
     */
    verifySignature(data, signature) {
        const {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData
        } = data;

        const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&transId=${transId}&resultCode=${resultCode}&message=${message}&payType=${payType}&responseTime=${responseTime}&extraData=${extraData}`;
        
        const expectedSignature = crypto
            .createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');

        return expectedSignature === signature;
    }

    /**
     * Parse webhook data
     */
    parseWebhookData(data) {
        const {
            orderId,
            transId,
            amount,
            resultCode,
            message,
            payType,
            responseTime
        } = data;

        return {
            orderId,
            transactionId: transId?.toString(),
            amount: parseInt(amount),
            status: resultCode === 0 ? 'succeeded' : 'failed',
            message: message || '',
            provider: 'momo',
            providerRef: transId?.toString(),
            paidAt: responseTime ? new Date(responseTime) : new Date()
        };
    }

    /**
     * Query transaction status (useful when webhook cannot reach local dev)
     */
    async queryTransaction(orderId) {
        if (!orderId) throw new Error('orderId is required to query MoMo transaction');

        const requestId = `${this.partnerCode}${Date.now()}`;
        const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');

        const payload = {
            partnerCode: this.partnerCode,
            requestId,
            orderId,
            signature,
            lang: 'vi'
        };

        const response = await fetch(this.queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`MoMo query failed: HTTP ${response.status}`);
        }

        const result = await response.json();
        if (typeof result.resultCode === 'undefined') {
            throw new Error('MoMo query response invalid');
        }

        return {
            orderId: result.orderId || orderId,
            transactionId: result.transId?.toString(),
            amount: parseInt(result.amount ?? 0),
            status: result.resultCode === 0 ? 'succeeded' : 'failed',
            message: result.message || '',
            provider: 'momo',
            providerRef: result.transId?.toString(),
            paidAt: result.responseTime ? new Date(result.responseTime) : new Date()
        };
    }
}

