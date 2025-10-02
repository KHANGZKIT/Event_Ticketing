import express from 'express';
import config, { matchRoute } from './config/config.js';
import { requestID } from './middlewares/requestID.js';
import cors from 'cors';
import helmet from 'helmet';
import { forward } from './proxy.js';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(requestID);


// Sample route
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'gateway', time: new Date().toISOString() });
})
app.use((req, res) => {
    const route = matchRoute(req.path);
    if (!route?.target) {
        res.status(404).json({
            error: { code: 'NO_ROUTE', message: 'No matching route' }
        });
    }
    return forward(req, res, route); s
})
app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
})
