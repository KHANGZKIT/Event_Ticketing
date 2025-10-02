import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: Number(process.env.PORT ?? 5000)
};

export const ROUTES = [
    { prefix: '/api/auth', target: process.env.AUTH_SVC_URL },
    { prefix: '/api/events', target: process.env.EVENT_SVC_URL },
    { prefix: '/api/holds', target: process.env.HOLD_SVC_URL },
    { prefix: '/api/orders', target: process.env.ORDER_SVC_URL },
    { prefix: '/api/payments', target: process.env.PAYMENT_SVC_URL },
    { prefix: '/api/tickets', target: process.env.TICKET_SVC_URL },
]

export const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health'
]
export const matchRoute = (path) => {
    const hits = ROUTES.filter(r => path.startsWith(r.prefix));
    if (hits.length === 0) return null;
    return hits.sort((a, b) => b.prefix.length - a.prefix.length)[0];
}
export default config;
