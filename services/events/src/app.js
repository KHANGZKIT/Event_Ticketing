import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import eventsRouter from './modules/events/events.routes.js';
import showsRouter from './modules/shows/shows.routes.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'events' }));

app.use('/api/events', eventsRouter);
app.use('/api/shows', showsRouter);

app.use(errorHandler);

export default app;