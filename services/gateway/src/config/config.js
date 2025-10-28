import dotenv from 'dotenv';
dotenv.config();

function ensureUrl(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    new URL(v);
    return v;
}

export const routes = [
    // FE: /api/auth/*  → Auth service: /auth/*
    { prefix: '/api/auth', target: ensureUrl('AUTH_SVC_URL'), rewrite: '/auth' },

    // Ví dụ các service khác (giữ nguyên hoặc thêm rewrite nếu backend không có /api/...):
    { prefix: '/api/events', target: ensureUrl('EVENT_SVC_URL'),   /* rewrite: '/events' */ },
    { prefix: '/api/shows', target: ensureUrl('SHOW_SVC_URL'),    /* rewrite: '/shows'  */ },
    { prefix: '/api/holds', target: ensureUrl('HOLD_SVC_URL') },
    { prefix: '/api/orders', target: ensureUrl('ORDER_SVC_URL') },
    { prefix: '/api/payments', target: ensureUrl('PAYMENT_SVC_URL') },
    { prefix: '/api/tickets', target: ensureUrl('TICKET_SVC_URL') },
];

export const serverOptions = {
    rateLimit: { windowMs: 60_000, max: 300 }, // nếu dùng express-rate-limit v7 thì đổi "max" -> "limit"
    timeoutMs: 10_000,
};

export const config = {
    port: Number(process.env.PORT ?? 4000),
};
