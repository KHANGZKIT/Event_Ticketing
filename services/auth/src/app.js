import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());


app.use('/auth', authRoutes);

app.get('/health', (_req, res) => {
    res.status(200).send('Auth service is healthy');
});

app.use(errorHandler);
export default app;