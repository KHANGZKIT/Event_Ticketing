/**
 * Base Payment Provider
 * Abstract class for payment gateway implementations
 */
export class BasePaymentProvider {
    constructor(config) {
        this.config = config;
    }

    /**
     * Create payment URL for redirect
     * @param {Object} params - Payment parameters
     * @returns {Promise<string>} Payment URL
     */
    async createPaymentUrl(params) {
        throw new Error('createPaymentUrl must be implemented by subclass');
    }

    /**
     * Verify webhook signature
     * @param {Object} data - Webhook data
     * @param {string} signature - Signature from webhook
     * @returns {boolean} True if signature is valid
     */
    verifySignature(data, signature) {
        throw new Error('verifySignature must be implemented by subclass');
    }

    /**
     * Parse webhook data
     * @param {Object} data - Raw webhook data
     * @returns {Object} Parsed payment data
     */
    parseWebhookData(data) {
        throw new Error('parseWebhookData must be implemented by subclass');
    }

    /**
     * Generate signature for request
     * @param {Object} params - Request parameters
     * @returns {string} Signature
     */
    generateSignature(params) {
        throw new Error('generateSignature must be implemented by subclass');
    }
}

