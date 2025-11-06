import { randomUUID } from 'node:crypto';
import { getRedis } from '../../redis/client.js';
import { incrMetric } from '../../utils/hardening.js';

const LOCK_MS = 3000;
const DEFAULT_TTL = 300;

function heldKey(showId, seatId) {
    return `held:${showId}:${seatId}`;
}

function holdKey(holdId) {
    return `hold:${holdId}`;
}
function lockKey(showId, seatId) {
    return `lock:held:${showId}:${seatId}`;
}

//Tao hold atomic cho nhieu ghe
// => {ok, holdId, expiresAt, conflicts[]}

export async function createHoldAtomic({ userId, showId, seatIds, ttlSec = DEFAULT_TTL }) {
    const redis = getRedis();
    const holdId = randomUUID();
    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
    const lockId = randomUUID();

    // input validation
    if (!userId || !showId || !Array.isArray(seatIds) || seatIds.length === 0) {
        console.log('[holds.err] invalid-input', { userId, showId, seatIds });
        return { ok: false, reason: 'Invalid input' };
    }

    // khi lock fail:
    console.log('[holds.err] lock-failed', { showId, seatId, acquired });

    // khi phát hiện conflicts từ MGET:
    console.log('[holds.err] seats-conflict', { showId, conflicts });

    //Lay ghe theo thu tu de tranh deadlock
    const acquired = [];
    const sorted = Array.from(new Set(seatIds)).sort();
    for (const seatId of sorted) {
        const ok = await redis.set(lockKey(showId, seatId), lockId, 'PX', LOCK_MS, 'NX');
        if (!ok) {
            await releaseLocks(redis, showId, acquired, lockId);
            return { ok: false, reason: 'lock-failed', conflicts: [seatId] };
        }

        acquired.push(seatId);
    }
    //Detect conflicts
    try {
        const heldKeys = sorted.map((id) => heldKey(showId, id));
        const heldVals = await redis.mget(heldKeys);
        const conflicts = [];
        console.log('[debug-held]', { heldKeys, heldVals });
        heldVals.forEach((v, index) => {
            if (v) {
                conflicts.push(sorted[index]);
            }
        });
        if (conflicts.length) {
            await releaseLocks(redis, showId, acquired, lockId);
            return { ok: false, reason: 'conflict', conflicts };
        }
        const tx = redis.multi();
        tx.set(holdKey(holdId), JSON.stringify({ userId, showId, seats: sorted, expiresAt }), 'EX', ttlSec);
        const RETRIES = 3, BASE = 40; // ms
        for (const seatId of sorted) {
            let ok = false, attempt = 0;
            while (!ok && attempt <= RETRIES) {
                ok = !!(await redis.set(lockKey(showId, seatId), lockId, 'PX', LOCK_MS, 'NX'));
                if (!ok) { attempt++; if (attempt > RETRIES) break; await incrMetric('holds:create:retry'); await sleep(jitter(BASE * attempt)); }
            }
            if (!ok) {
                await releaseLocks(redis, showId, acquired, lockId);
                await incrMetric('holds:create:conflict');
                logx('holds.create.conflict', { userId, showId, seatId });
                return { ok: false, reason: 'conflict', conflicts: [seatId] };
            }
            acquired.push(seatId);
        }
        console.log('[debug-write]', {
            holdKey: holdKey(holdId),
            heldKeys: sorted.map(s => heldKey(showId, s)),
            ttlSec
        });
        const out = await tx.exec();
        console.log('[debug-out]', out); // kỳ vọng: [[null,"OK"], [null,"OK"], ...]
        if (!out || out.some(([err]) => err)) {
            console.log('[holds.err] tx-failed', { out });
            return { ok: false, reason: 'tx-failed', out };
        }
        return { ok: true, holdId, expiresAt, seats: sorted };
    } finally {
        await releaseLocks(redis, showId, acquired, lockId);
    }
}
async function releaseLocks(redis, showId, seatIds, lockId) {
    for (const seatId of seatIds) {
        const k = lockKey(showId, seatId);
        try {
            const v = await redis.get(k);
            if (v === lockId) await redis.del(k);
        } catch (err) {
            // swallow individual release errors to ensure best-effort cleanup
        }
    }

}
