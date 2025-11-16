import crypto from 'crypto';
import { BasePaymentProvider } from './base.provider.js';
import { stringify } from 'querystring';

/**
 * VNPay Payment Provider
 * Documentation: https://sandbox.vnpayment.vn/apis/
 */
export class VNPayProvider extends BasePaymentProvider {
    constructor(config) {
        super(config);
        this.tmnCode = config.tmnCode;
        this.secretKey = config.secretKey;
        this.baseUrl = config.url || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        this.returnUrl = config.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment/return`;
    }

    /**
     * Generate VNPay signature
     */
    generateSignature(params) {
        // Sort parameters by key
        const sortedParams = Object.keys(params)
            .filter(key => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
            .sort()
            .reduce((result, key) => {
                result[key] = params[key];
                return result;
            }, {});

        // Create query string
        const queryString = stringify(sortedParams);

        // Create HMAC SHA512
        const hmac = crypto.createHmac('sha512', this.secretKey);
        hmac.update(queryString);
        return hmac.digest('hex');
    }

    /**
     * Create payment URL
     */
    async createPaymentUrl({ orderId, amount, orderInfo, returnUrl, cancelUrl }) {
        const vnp_TxnRef = orderId;
        const vnp_OrderInfo = orderInfo || `Thanh toan don hang ${orderId}`;
        const vnp_Amount = amount * 100; // VNPay uses cents
        const vnp_CreateDate = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '00';
        const vnp_ExpireDate = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            .toISOString().replace(/[-:]/g, '').split('.')[0] + '00';
        const vnp_IpAddr = '127.0.0.1'; // Should get from request
        const vnp_CurrCode = 'VND';
        const vnp_Locale = 'vn';
        const vnp_ReturnUrl = returnUrl || this.returnUrl;

        const params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: this.tmnCode,
            vnp_Amount: vnp_Amount.toString(),
            vnp_CurrCode: vnp_CurrCode,
            vnp_TxnRef: vnp_TxnRef,
            vnp_OrderInfo: vnp_OrderInfo,
            vnp_OrderType: 'other',
            vnp_Locale: vnp_Locale,
            vnp_ReturnUrl: vnp_ReturnUrl,
            vnp_IpAddr: vnp_IpAddr,
            vnp_CreateDate: vnp_CreateDate,
            vnp_ExpireDate: vnp_ExpireDate
        };

        // Generate signature
        params.vnp_SecureHash = this.generateSignature(params);

        // Build payment URL
        const queryString = stringify(params);

        return {
            paymentUrl: `${this.baseUrl}?${queryString}`,
            requestId: vnp_TxnRef
        };
    }

    /**
     * Verify webhook signature
     */
    verifySignature(data, signature) {
        const sortedParams = Object.keys(data)
            .filter(key => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
            .sort()
            .reduce((result, key) => {
                result[key] = data[key];
                return result;
            }, {});

        const queryString = stringify(sortedParams);

        const hmac = crypto.createHmac('sha512', this.secretKey);
        hmac.update(queryString);
        const expectedSignature = hmac.digest('hex');

        return expectedSignature === signature;
    }

    /**
     * Parse webhook data
     */
    parseWebhookData(data) {
        const {
            vnp_TxnRef,
            vnp_TransactionNo,
            vnp_Amount,
            vnp_BankCode,
            vnp_CardType,
            vnp_PayDate,
            vnp_TransactionStatus,
            vnp_ResponseCode
        } = data;

        const amount = parseInt(vnp_Amount) / 100; // Convert from cents
        const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';

        // Parse pay date
        let paidAt = new Date();
        if (vnp_PayDate) {
            // Format: yyyyMMddHHmmss
            const year = vnp_PayDate.substring(0, 4);
            const month = vnp_PayDate.substring(4, 6);
            const day = vnp_PayDate.substring(6, 8);
            const hour = vnp_PayDate.substring(8, 10);
            const minute = vnp_PayDate.substring(10, 12);
            const second = vnp_PayDate.substring(12, 14);
            paidAt = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        }

        return {
            orderId: vnp_TxnRef,
            transactionId: vnp_TransactionNo,
            amount,
            status: isSuccess ? 'succeeded' : 'failed',
            message: isSuccess ? 'Payment successful' : `Payment failed: ${vnp_ResponseCode}`,
            provider: 'vnpay',
            providerRef: vnp_TransactionNo,
            bankCode: vnp_BankCode,
            cardType: vnp_CardType,
            paidAt
        };
    }
}

