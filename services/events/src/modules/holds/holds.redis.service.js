import crypto from 'node:crypto';
import { prisma } from '@app/db';
import { redis } from '../../redis/client.js';
import { CreateHoldSchema } from './holds.schema.js';
import { getSeatMap } from '../shows/shows.service.js';

const HOLD_TTL_SECONDS = Number(process.env.HOLD_TTL_SECONDS || 300);

const heldKey = (showId, seatId) => `held:${showId}:${seatId}`;
const holdKey = (holdId) => `hold:${holdId}`;

/**
 * Tạo hold (Redis)
 * - validate body
 * - check seats tồn tại
 * - check sold (DB)
 * - check held (Redis)
 * - tạo holdId + set 2 loại key với TTL
 */
export async function createHold(userId, body, options = {}) {
    const { showId, seats } = CreateHoldSchema.parse(body);
    const idempotencyKey = options.idempotencyKey || body.idempotencyKey || null;
    const idemRedisKey = idempotencyKey ? `idem:${userId}:${idempotencyKey}` : null;

    // if mapping exists -> return existing hold
    if (idemRedisKey) {
        const mapped = await redis.get(idemRedisKey);
        if (mapped && mapped !== 'PENDING') {
            // mapped is holdId
            const raw = await redis.get(holdKey(mapped));
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    return { holdId: mapped, expiresAt: parsed.expiresAt };
                } catch { /* fallthrough to create new */ }
            }
        }
    }

    // try to reserve idempotency slot (avoid races)
    let reserved = false;
    if (idemRedisKey) {
        const ok = await redis.set(idemRedisKey, 'PENDING', 'NX', 'EX', HOLD_TTL_SECONDS);
        reserved = !!ok;
        if (!reserved) {
            // another request is creating/has created — try to read mapped value a few times
            for (let i = 0; i < 5; i++) {
                const val = await redis.get(idemRedisKey);
                if (val && val !== 'PENDING') {
                    const raw = await redis.get(holdKey(val));
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            return { holdId: val, expiresAt: parsed.expiresAt };
                        } catch { break; }
                    }
                }
                // short backoff
                await new Promise(r => setTimeout(r, 100 * (i + 1)));
            }
            // fallback: try to acquire reservation again
            const ok2 = await redis.set(idemRedisKey, 'PENDING', 'NX', 'EX', HOLD_TTL_SECONDS);
            reserved = !!ok2;
            if (!reserved) {
                // give up to avoid indefinite wait; client can retry
                const e = new Error('Idempotency busy, try again'); e.status = 409; throw e;
            }
        }
    }

    try {
        // 1) seats must exist
        const seatmap = await getSeatMap(showId);
        const valid = new Set(seatmap.seats.map(s => s.seatId));
        for (const s of seats) {
            if (!valid.has(s)) {
                const e = new Error(`Seat ${s} not found`); e.status = 404; throw e;
            }
        }

        // 2) not sold (DB)
        const sold = await prisma.ticket.findMany({
            where: { showId, seatId: { in: seats } },
            select: { seatId: true }
        });
        if (sold.length) {
            const e = new Error(`Seats sold: ${sold.map(x => x.seatId).join(',')}`);
            e.status = 409; throw e;
        }

        // 3) not held (Redis)
        const existsPipe = redis.pipeline();
        seats.forEach(seatId => existsPipe.exists(heldKey(showId, seatId)));
        const existsRes = await existsPipe.exec(); // [[null, 0/1], ...]
        const alreadyHeld = seats.filter((_, i) => (existsRes[i]?.[1] || 0) > 0);
        if (alreadyHeld.length) {
            const e = new Error(`Seat(s) already held: ${alreadyHeld.join(',')}`);
            e.status = 409; throw e;
        }

        // 4) create keys
        const holdId = crypto.randomUUID();
        const expiresAt = Date.now() + HOLD_TTL_SECONDS * 1000;
        const payload = JSON.stringify({ userId, showId, seats, expiresAt });

        const setPipe = redis.pipeline();
        setPipe.set(holdKey(holdId), payload, 'EX', HOLD_TTL_SECONDS);
        seats.forEach(seatId => {
            setPipe.set(heldKey(showId, seatId), holdId, 'EX', HOLD_TTL_SECONDS);
        });
        await setPipe.exec();

        // write idempotency mapping -> holdId (overwrite PENDING)
        if (idemRedisKey) {
            await redis.set(idemRedisKey, holdId, 'EX', HOLD_TTL_SECONDS);
        }

        return { holdId, expiresAt };
    } catch (err) {
        // cleanup reserved idempotency slot so client can retry
        if (reserved && idemRedisKey) {
            try { await redis.del(idemRedisKey); } catch { }
        }
        throw err;
    }
}

/**
 * Release hold (idempotent)
 * - xóa tất cả held:* theo seats của hold
 * - xóa hold:<id>
 */
export async function releaseHold(holdId) {
    // const r = getRedis(); // removed undefined call
    const r = redis;
    const key = `hold:${holdId}`;

    // 1) đọc hold
    const raw = await r.get(key);
    if (!raw) return { ok: true, idempotent: true }; // đã huỷ trước đó

    const h = JSON.parse(raw); // { userId, showId, seats[], expiresAt }

    // 2) xóa an toàn các held: chỉ DEL nếu giá trị == holdId (tránh xoá nhầm)
    const tx = r.multi();
    for (const seatId of h.seats) {
        const hk = `held:${h.showId}:${seatId}`;
        // TODO: kiểm tra giá trị
        //  Gợi ý: dùng Lua (EVAL) hoặc 2 bước GET→DEL có kiểm tra
        tx.eval(`return redis.call('GET', KEYS[1]) == ARGV[1] and redis.call('DEL', KEYS[1]) or 0`, 1, hk, holdId);
    }
    tx.del(key); // xóa hold:<id>
    const out = await tx.exec();

    return { ok: true, released: h.seats.length, out };
}

/**
 * Lấy hold:<id> (parse JSON)
 */
export async function getHold(holdId) {
    const raw = await redis.get(holdKey(holdId));
    if (!raw) return null;
    try {
        const h = JSON.parse(raw);
        // chuyển seats thành Set nếu code cũ kỳ vọng Set
        h.seats = new Set(h.seats || []);
        return h;
    } catch {
        return null;
    }
}

/**
 * Consume hold:
 * - đọc hold
 * - xóa toàn bộ held:* + hold:<id>
 * - trả h
 */
export async function consumeHold(holdId) {
    const h = await getHold(holdId);
    if (!h) return null;
    const delPipe = redis.pipeline();
    h.seats.forEach(seatId => delPipe.del(heldKey(h.showId, seatId)));
    delPipe.del(holdKey(holdId));
    await delPipe.exec();
    return h;
}

/**
 * Hỗ trợ availability:
 * - lấy danh sách seat đang held của showId
 * - tránh dùng KEYS, dùng SCAN an toàn hơn
 */
export async function getHeldSeatByShow(showId) {
    const prefix = `held:${showId}:`;
    const seats = new Set();
    let cursor = '0';
    do {
        // scan từng đợt
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500);
        cursor = next;
        keys.forEach(k => {
            const seatId = k.substring(prefix.length);
            if (seatId) seats.add(seatId);
        });
    } while (cursor !== '0');
    return seats; // Set<seatId>
}
