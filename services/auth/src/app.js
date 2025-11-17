import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
app.use(express.json());
app.use(helmet());

const defaultOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5502',
    'http://localhost:5503',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'http://127.0.0.1:5503'
];

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : defaultOrigins;

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn('[auth][cors] Blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use('/auth', authRoutes);

app.get('/health', (_req, res) => {
    res.status(200).send('Auth service is healthy');
});

app.use(errorHandler);
export default app;