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
import ticketsRouter from './modules/tickets/tickets.routes.js';
import ticketsQRRouter from './modules/tickets/tickets.qr.routes.js';
import { errorHandler } from './middlewares/error.js';
import { ensureRedis } from './redis/client.js';
import { redisRouter } from './redis/helpredis.js';
import { redisDebugRouter } from './redis/debug.routes.js';
import { holdsMetricsRouter } from './modules/holds/holds.metrics.routes.js';
import { holdsConsumeRouter } from './modules/holds/holds.consume.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'events' }));

app.use('/api/events', eventsRouter);
app.use('/api/shows', showsRouter);
app.use('/api/shows', showsStatsRouter);
app.use('/api/holds', holdsRouter, holdsConsumeRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets', ticketsQRRouter);
app.use(holdsMetricsRouter)
await ensureRedis();
app.use(redisRouter);
app.use(redisDebugRouter);
app.use('/api/dashboard', dashboardRouter)
app.use(errorHandler);

export default app;