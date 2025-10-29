import { Router } from 'express';
import { getRedis } from './client.js';

export const redisDebugRouter = Router();

/** POST /debug/redis/warm  body: { key?, value?, ttlSeconds? } */
redisDebugRouter.post('/debug/redis/warm', async (req, res) => {
    const redis = getRedis();
    const { key, value = 'hello', ttlSeconds = 10 } = req.body || {};
    const k = key || `warm:${Date.now()}`;

    await redis.setex(k, Number(ttlSeconds), String(value)); // nếu NaN sẽ ném lỗi
    const ttl = await redis.ttl(k);
    res.json({ ok: true, key: k, value, ttl, ttlSeconds: Number(ttlSeconds) });
});


/** GET /debug/redis/ttl/:key  -> { ttl, pttl } */
redisDebugRouter.get('/debug/redis/ttl/:key', async (req, res) => {
    const redis = getRedis();
    const k = req.params.key;
    const ttl = await redis.ttl(k)
    const pttl = await redis.pttl(k)
    res.json({ key: k, ttl, pttl });
});

/** GET /debug/redis/scan?prefix=warm:*&count=10&cursor=0 */
redisDebugRouter.get('/debug/redis/scan', async (req, res) => {
    const redis = getRedis();
    const prefix = String(req.query.prefix || 'warm:*');
    const count = Number(req.query.count || 10);
    const cursor = String(req.query.cursor || '0');

    const [next, keys] = await redis.scan(cursor, 'MATCH', prefix, 'COUNT', count);
    res.json({ cursorIn: cursor, next, keys });
});


/** GET /debug/redis/keys?pattern=warm:*  (⚠ only dev) */
redisDebugRouter.get('/debug/redis/keys', async (req, res) => {
    const redis = getRedis();
    const pattern = String(req.query.pattern || 'warm:*');
    const keys = await redis.keys(pattern)
    res.json({ warning: 'DEV ONLY: KEYS blocks on big keyspace', keys });
});

