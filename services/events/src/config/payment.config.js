import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Get payment provider configuration
 */
export function getPaymentConfig(providerName) {
    switch (providerName) {
        case 'momo':
            return {
                partnerCode: process.env.MOMO_PARTNER_CODE || '',
                accessKey: process.env.MOMO_ACCESS_KEY || '',
                secretKey: process.env.MOMO_SECRET_KEY || '',
                environment: process.env.MOMO_ENVIRONMENT || 'sandbox',
                partnerName: process.env.MOMO_PARTNER_NAME || 'Event Ticketing',
                storeId: process.env.MOMO_STORE_ID || 'EventTicketingStore',
                returnUrl: process.env.MOMO_RETURN_URL || `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/return/momo`
            };
        
        case 'vnpay':
            return {
                tmnCode: process.env.VNPAY_TMN_CODE || '',
                secretKey: process.env.VNPAY_SECRET_KEY || '',
                url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
                returnUrl: process.env.VNPAY_RETURN_URL || `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/return/vnpay`
            };
        
        default:
            throw new Error(`Unknown payment provider: ${providerName}`);
    }
}

