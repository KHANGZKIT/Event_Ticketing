import { getRedis } from "../../redis/client.js";
const IDEM_TTL = 300;

const idemKey = (userId, key) => `idem:holds:${userId}:${key}`;

export async function getIdem(userId, key) {
    if (!key) {
        return null;
    }
    const r = getRedis();
    return JSON.parse(await r.get(idemKey(userId, key)) || 'null');
}

export async function setIdem(userId, key, payload) {
    if (!key) {
        return;
    }
    const r = getRedis();
    await r.setex(idemKey(userId, key), IDEM_TTL, JSON.stringify(payload));
}
