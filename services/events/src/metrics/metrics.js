import { getRedis } from '../redis/client.js';

const PREFIX = 'metrics:holds:';

export async function incrMetric(name, by = 1) {
  const r = getRedis();
  await r.incrby(`${PREFIX}${name}`, by);
}

export async function getMetrics(names) {
  const r = getRedis();
  const keys = names.map(n => `${PREFIX}${n}`);
  const vals = await r.mget(keys);
  const out = {};
  names.forEach((n, i) => { out[n] = Number(vals[i] || 0); });
  return out;
}
