import dotenv from 'dotenv';
dotenv.config(); // đọc services/gateway/.env

function ensureUrl(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    // ném lỗi nếu URL không hợp lệ
    new URL(v);
    return v;
}

export const routes = [
    { prefix: '/api/auth', target: ensureUrl('AUTH_SVC_URL') },
    { prefix: '/api/events', target: ensureUrl('EVENT_SVC_URL') },
    { prefix: '/api/holds', target: ensureUrl('HOLD_SVC_URL') },
    { prefix: '/api/orders', target: ensureUrl('ORDER_SVC_URL') },
    { prefix: '/api/payments', target: ensureUrl('PAYMENT_SVC_URL') },
    { prefix: '/api/tickets', target: ensureUrl('TICKET_SVC_URL') },
];

export const serverOptions = {
    rateLimit: { windowMs: 60_000, max: 300 },
    timeoutMs: 5000,
};

export const config = {
    port: Number(process.env.PORT ?? 4000),
};
