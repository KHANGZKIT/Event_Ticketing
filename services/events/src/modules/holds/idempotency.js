import { getRedis } from "../../redis/client.js";
const IDEM_TTL = 300;

const idemKey = (userId, key) => `idem:holds:${userId}:${key}`;

export async function getIdem(userId, key) {
    if (!key) {
        return null;
    }
    try {
        const r = getRedis();
        const val = await r.get(idemKey(userId, key));
        if (!val) return null;
        return JSON.parse(val);
    } catch (e) {
        console.error('[idempotency.getIdem] error:', e);
        return null;
    }
}

export async function setIdem(userId, key, payload) {
    if (!key) {
        return;
    }
    try {
        const r = getRedis();
        await r.setex(idemKey(userId, key), IDEM_TTL, JSON.stringify(payload));
    } catch (e) {
        console.error('[idempotency.setIdem] error:', e);
        // Không throw để không làm gián đoạn flow chính
    }
}
