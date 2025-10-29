import { Router } from 'express';
import { getRedis } from './client.js';

export const redisRouter = Router();

redisRouter.get('/health/redis', async (req, res) => {
    try {
        const redis = getRedis();
        if (redis.status !== 'ready' && redis.status !== 'connecting') {
            await redis.connect(); // connect nếu chưa
        }
        const pong = await redis.ping(); // <- await, không callback
        res.json({ ok: true, pong });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
