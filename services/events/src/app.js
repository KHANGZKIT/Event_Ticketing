import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import eventsRouter from './modules/events/events.routes.js';
import showsRouter from './modules/shows/shows.routes.js';
import showsStatsRouter from './modules/shows/shows.stats.routes.js';
import holdsRouter from './modules/holds/holds.routes.js';
import ordersRouter from './modules/orders/orders.routes.js';
import ordersRoutes from './modules/orders/orders.query.routes.js'
import paymentsRouter from './modules/payments/payments.routes.js';
import ticketsRouter from './modules/tickets/tickets.routes.js';
import ticketsQRRouter from './modules/tickets/tickets.qr.routes.js';
import { errorHandler } from './middlewares/error.js';
import { ensureRedis } from './redis/client.js';
import { redisRouter } from './redis/helpredis.js';
import { redisDebugRouter } from './redis/debug.routes.js';
import { holdsMetricsRouter } from './modules/holds/holds.metrics.routes.js';
import { holdsConsumeRouter } from './modules/holds/holds.consume.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import couponsRouter from './modules/coupons/coupons.routes.js';
import seatmapsRouter from './modules/seatmaps/seatmaps.routes.js';

const app = express();
app.use(express.json());

const defaultOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5502',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'http://127.0.0.1:5503',
    'http://127.0.0.1:5504'
];
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : defaultOrigins;

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn('[events][cors] Blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'events' }));

app.use('/api/events', eventsRouter);
app.use('/api/shows', showsRouter);
app.use('/api/shows', showsStatsRouter);
app.use('/api/holds', holdsRouter, holdsConsumeRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets', ticketsQRRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/seatmaps', seatmapsRouter);

app.use(holdsMetricsRouter)
await ensureRedis();
app.use(redisRouter);
app.use(redisDebugRouter);
app.use('/api/dashboard', dashboardRouter)
app.use(errorHandler);

export default app;