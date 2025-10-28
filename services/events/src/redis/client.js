import Redis from 'ioredis';
import { REDIS_URL } from '../config/env.js';

let _redis;

export function getRedis() {
  if (_redis) return _redis;
  _redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });
  _redis.on('ready', () => console.log('[redis] ready'));
  _redis.on('error', (e) => console.error('[redis] error:', e.message));
  _redis.on('end', () => console.log('[redis] end'));
  return _redis;
}

export async function ensureRedis() {
  const r = getRedis();
  if (r.status === 'end' || r.status === 'wait') {
    await r.connect();
  }
  // ping để chắc chắn
  const pong = await r.ping(); // nếu thất bại -> throw
  console.log('[redis] connected:', REDIS_URL, 'pong=', pong);
}

export const redis = getRedis();