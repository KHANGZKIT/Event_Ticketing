import crypto from "crypto";
import { BasePaymentProvider } from "./base.provider.js";

/**
 * sort + encode giống đúng sample NodeJS của VNPAY
 * - sort theo tên field
 * - key, value đều encodeURIComponent, space -> "+"
 * - return object có key/val đã encode sẵn
 */
function encodeAndSortParams(params) {
    const filteredKeys = Object.keys(params)
        .filter((k) => params[k] !== null && params[k] !== undefined && params[k] !== "")
        .sort();

    const sorted = {};
    for (const k of filteredKeys) {
        const encKey = encodeURIComponent(k); // vnp_TmnCode -> vnp_TmnCode (không đổi nhưng đúng form)
        const encVal = encodeURIComponent(String(params[k])).replace(/%20/g, "+");
        sorted[encKey] = encVal;
    }
    return sorted;
}

export class VNPayProvider extends BasePaymentProvider {
    constructor(config) {
        super(config);

        this.tmnCode = (config.tmnCode || process.env.VNPAY_TMN_CODE || "").trim();
        this.secretKey = (config.secretKey || process.env.VNPAY_SECRET_KEY || "").trim();
        this.baseUrl =
            config.url ||
            process.env.VNPAY_URL ||
            "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

        this.bankCode = config.bankCode || process.env.VNPAY_BANK_CODE || null;

        this.returnUrl =
            config.returnUrl ||
            process.env.VNPAY_RETURN_URL ||
            `${process.env.FRONTEND_URL || "http://localhost:4000"}/frontend/PurchaseUI/payment-return.html`;

        console.log("[VNPay CONFIG] tmnCode =", this.tmnCode, "len =", this.tmnCode.length);
        console.log("[VNPay CONFIG] secret len =", this.secretKey.length);
    }

    // yyyyMMddHHmmss
    buildDate(date = new Date()) {
        const pad = (n) => n.toString().padStart(2, "0");
        const y = date.getFullYear();
        const M = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        const s = pad(date.getSeconds());
        return `${y}${M}${d}${h}${m}${s}`;
    }

    // vnp_TxnRef kiểu 6 chữ số (giống sample của VNPAY)
    buildTxnRef(date = new Date()) {
        const pad = (n) => n.toString().padStart(2, "0");
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        const s = pad(date.getSeconds());
        return `${h}${m}${s}`; // HHmmss
    }

    /**
     * Tạo HMAC-SHA512 theo đúng docs VNPAY:
     *   1. Sort params by key
     *   2. Create query string từ RAW values (không encode)
     *   3. Hash bằng HMAC_SHA512
     */
    signHmac512(rawParams) {
        // Filter và sort
        const sortedKeys = Object.keys(rawParams)
            .filter((k) => rawParams[k] !== null && rawParams[k] !== undefined && rawParams[k] !== "")
            .sort();

        // Tạo signData từ RAW values (không encode)
        const signData = sortedKeys
            .map((key) => `${key}=${rawParams[key]}`)
            .join("&");

        console.log("[VNPay] Signature query string (RAW):", signData);

        const hmac = crypto.createHmac("sha512", this.secretKey);
        return hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    }

    /**
     * Được gọi từ payments.service -> createPayment
     */
    async createPaymentUrl({ orderId, amount, orderInfo, returnUrl }) {
        const orderAmount = Math.round(Number(amount || 0));
        if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
            throw new Error(`Invalid VNPay amount: ${amount}`);
        }

        const now = new Date();
        const vnp_TxnRef = this.buildTxnRef(now); // theo dạng HHmmss
        const vnp_Amount = orderAmount * 100;
        const vnp_OrderInfo = orderInfo || `Thanh toan cho don hang ${orderId}`;
        const vnp_CreateDate = this.buildDate(now);
        const vnp_ExpireDate = this.buildDate(new Date(now.getTime() + 15 * 60 * 1000));
        const vnp_ReturnUrl = returnUrl || this.returnUrl;
        const vnp_IpAddr = "127.0.0.1"; // test local

        // params RAW (chưa encode)
        let rawParams = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: this.tmnCode,
            vnp_Amount: vnp_Amount.toString(),
            vnp_CurrCode: "VND",
            vnp_TxnRef,
            vnp_OrderInfo,
            vnp_OrderType: "other",
            vnp_Locale: "vn",
            vnp_ReturnUrl: vnp_ReturnUrl,
            vnp_IpAddr,
            vnp_CreateDate,
            vnp_ExpireDate
        };

        if (this.bankCode) {
            rawParams.vnp_BankCode = this.bankCode;
        }

        // 1) Sign bằng RAW params
        const secureHash = this.signHmac512(rawParams);

        // 2) Encode params cho URL
        const sortedKeys = Object.keys(rawParams)
            .filter((k) => rawParams[k] !== null && rawParams[k] !== undefined && rawParams[k] !== "")
            .sort();

        const queryParts = sortedKeys.map((key) => {
            const encVal = encodeURIComponent(String(rawParams[key])).replace(/%20/g, "+");
            return `${key}=${encVal}`;
        });

        // 3) Thêm SecureHash
        queryParts.push(`vnp_SecureHash=${secureHash}`);

        const query = queryParts.join("&");
        const finalUrl = `${this.baseUrl}?${query}`;
        console.log("[VNPay] Final URL:", finalUrl);

        return {
            paymentUrl: finalUrl,
            provider: "vnpay",
            transactionId: null,
            requestId: vnp_TxnRef // mình lưu TxnRef; còn orderId vẫn nằm trong vnp_OrderInfo + returnUrl
        };
    }

    /**
     * Verify chữ ký cho IPN/return (để dùng sau)
     */
    verifySignature(data, signature) {
        if (!signature) return false;

        const filtered = {};
        for (const [k, v] of Object.entries(data)) {
            if (
                v !== undefined &&
                v !== null &&
                v !== "" &&
                k !== "vnp_SecureHash" &&
                k !== "vnp_SecureHashType"
            ) {
                filtered[k] = v;
            }
        }

        const encodedSorted = encodeAndSortParams(filtered);
        const expected = this.signHmac512(encodedSorted).toUpperCase();
        return expected === String(signature).toUpperCase();
    }

    // parseWebhookData giữ nguyên như bản trước của bạn
    parseWebhookData(data) {
        const {
            vnp_TxnRef,
            vnp_TransactionNo,
            vnp_Amount,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_BankCode,
            vnp_CardType,
            vnp_PayDate,
            vnp_OrderInfo
        } = data;

        const amount = vnp_Amount ? parseInt(vnp_Amount, 10) / 100 : 0;

        // Parse đúng orderId (UUID) từ vnp_OrderInfo: "Thanh toan cho don hang <orderId>"
        let realOrderId = null;
        if (vnp_OrderInfo) {
            const m = String(vnp_OrderInfo).match(/don hang\s+([0-9a-fA-F-]{8,})/i);
            if (m) {
                realOrderId = m[1]; // chính là orderId trong DB
            }
        }

        let paidAt = null;
        if (vnp_PayDate && String(vnp_PayDate).length === 14) {
            const str = String(vnp_PayDate);
            const year = Number(str.substring(0, 4));
            const month = Number(str.substring(4, 6)) - 1;
            const day = Number(str.substring(6, 8));
            const hour = Number(str.substring(8, 10));
            const minute = Number(str.substring(10, 12));
            const second = Number(str.substring(12, 14));
            paidAt = new Date(year, month, day, hour, minute, second);
        }

        const isSuccess =
            vnp_ResponseCode === "00" && vnp_TransactionStatus === "00";

        return {
            // 👉 orderId bây giờ là UUID thật lấy từ OrderInfo
            orderId: realOrderId,

            // Mã giao dịch của VNPay (trace)
            transactionId: vnp_TransactionNo,

            amount,
            status: isSuccess ? "succeeded" : "failed",
            message: isSuccess
                ? "Payment successful"
                : `Payment failed: ${vnp_ResponseCode}`,
            provider: "vnpay",

            // 👉 providerRef để tìm payment: TRÙNG với cái bạn đã lưu khi createPayment
            // (requestId / vnp_TxnRef)
            providerRef: vnp_TxnRef,

            bankCode: vnp_BankCode,
            cardType: vnp_CardType,
            paidAt
        };
    }

}
