import crypto from 'node:crypto';
import { prisma } from '@app/db';
import { redis } from '../../redis/client.js';
import { CreateHoldSchema } from './holds.schema.js';
import { getSeatMap } from '../shows/shows.service.js';
import { incrMetric } from '../../metrics/metrics.js';
import { logx } from '../../utils/logx.js';

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
 * - hỗ trợ idempotency bằng Redis key: idem:<userId>:<idempotencyKey>
 */
export async function createHold(userId, body, options = {}) {
    const { showId, seats } = CreateHoldSchema.parse(body);
    const idempotencyKey = options.idempotencyKey || body.idempotencyKey || null;
    const idemRedisKey = idempotencyKey ? `idem:${userId}:${idempotencyKey}` : null;

    if (idemRedisKey) {
        const mapped = await redis.get(idemRedisKey);
        if (mapped && mapped !== 'PENDING') {
            const raw = await redis.get(holdKey(mapped));
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    logx('holds.create.idempotent.hit', { userId, showId, holdId: mapped });
                    return { ok: true, holdId: mapped, expiresAt: parsed.expiresAt, idempotent: true };
                } catch {
                    // fallthrough
                }
            }
        }
    }

    let reserved = false;
    if (idemRedisKey) {
        const ok = await redis.set(idemRedisKey, 'PENDING', 'NX', 'EX', HOLD_TTL_SECONDS);
        reserved = !!ok;
        if (!reserved) {
            for (let i = 0; i < 5; i++) {
                const val = await redis.get(idemRedisKey);
                if (val && val !== 'PENDING') {
                    const raw = await redis.get(holdKey(val));
                    if (raw) {
                        try {
                            const parsed = JSON.parse(raw);
                            logx('holds.create.idempotent.wait_hit', { userId, showId, holdId: val });
                            return { ok: true, holdId: val, expiresAt: parsed.expiresAt, idempotent: true };
                        } catch {
                            break;
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 100 * (i + 1)));
            }
            const ok2 = await redis.set(idemRedisKey, 'PENDING', 'NX', 'EX', HOLD_TTL_SECONDS);
            reserved = !!ok2;
            if (!reserved) {
                const e = new Error('Idempotency busy, try again');
                e.status = 409;
                logx('holds.create.idempotent.busy', { userId, showId }, 'warn');
                throw e;
            }
        }
    }

    try {
        const seatmap = await getSeatMap(showId);
        const valid = new Set(seatmap.seats.map(s => s.seatId));
        for (const s of seats) {
            if (!valid.has(s)) {
                const e = new Error(`Seat ${s} not found`);
                e.status = 404;
                logx('holds.create.invalid_seat', { userId, showId, seat: s }, 'warn');
                throw e;
            }
        }

        const sold = await prisma.ticket.findMany({
            where: { showId, seatId: { in: seats } },
            select: { seatId: true }
        });
        if (sold.length) {
            const list = sold.map(x => x.seatId);
            logx('holds.create.sold_conflict', { userId, showId, seats: list }, 'warn');
            const e = new Error(`Seats sold: ${list.join(',')}`);
            e.status = 409;
            throw e;
        }

        const existsPipe = redis.pipeline();
        seats.forEach(seatId => existsPipe.exists(heldKey(showId, seatId)));
        const existsRes = await existsPipe.exec();
        const alreadyHeld = seats.filter((_, i) => (existsRes[i]?.[1] || 0) > 0);
        if (alreadyHeld.length) {
            await incrMetric('create:conflict');
            logx('holds.create.conflict', { userId, showId, seats, conflicts: alreadyHeld }, 'warn');
            const e = new Error(`Seat(s) already held: ${alreadyHeld.join(',')}`);
            e.status = 409;
            throw e;
        }

        const holdId = crypto.randomUUID();
        const expiresAt = Date.now() + HOLD_TTL_SECONDS * 1000;
        const payload = JSON.stringify({ userId, showId, seats, expiresAt });

        const setPipe = redis.pipeline();
        setPipe.set(holdKey(holdId), payload, 'EX', HOLD_TTL_SECONDS);
        seats.forEach(seatId => {
            setPipe.set(heldKey(showId, seatId), holdId, 'EX', HOLD_TTL_SECONDS);
        });
        const out = await setPipe.exec();
        if (!out || out.some(([err]) => err)) {
            await incrMetric('create:tx_failed');
            logx('holds.create.tx_failed', { userId, showId, seats, out }, 'error');
            return { ok: false, reason: 'tx-failed', out };
        }

        if (idemRedisKey) {
            await redis.set(idemRedisKey, holdId, 'EX', HOLD_TTL_SECONDS);
        }

        await incrMetric('create:ok');
        logx('holds.create.ok', { userId, showId, holdId, seats, expiresAt });
        return { ok: true, holdId, expiresAt };
    } catch (err) {
        if (reserved && idemRedisKey) {
            try { await redis.del(idemRedisKey); } catch { }
        }
        logx('holds.create.error', { userId, showId, message: err?.message }, 'error');
        throw err;
    }
}

/**
 * Release hold (idempotent)
 * - xóa tất cả held:* theo seats của hold
 * - xóa hold:<id>
 */
export async function releaseHold(holdId) {
    const r = redis;
    const key = `hold:${holdId}`;

    const raw = await r.get(key);
    if (!raw) {
        logx('holds.release.idempotent', { holdId });
        return { ok: true, idempotent: true };
    }

    const h = JSON.parse(raw); // { userId, showId, seats[], expiresAt }

    const tx = r.multi();
    for (const seatId of h.seats) {
        const hk = `held:${h.showId}:${seatId}`;
        tx.eval(
            "return redis.call('GET', KEYS[1]) == ARGV[1] and redis.call('DEL', KEYS[1]) or 0",
            1, hk, holdId
        );
    }
    tx.del(key);
    const out = await tx.exec();

    logx('holds.release.ok', { holdId, showId: h.showId, released: h.seats.length });
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
    logx('holds.consume.ok', { holdId, showId: h.showId, seats: Array.from(h.seats || []) });
    return h;
}

/**
 * Hỗ trợ availability:
 * - lấy danh sách seat đang held của showId (dùng SCAN)
 */
export async function getHeldSeatByShow(showId) {
    const prefix = `held:${showId}:`;
    const seats = new Set();
    let cursor = '0';
    do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500);
        cursor = next;
        keys.forEach(k => {
            const seatId = k.substring(prefix.length);
            if (seatId) seats.add(seatId);
        });
    } while (cursor !== '0');
    return seats;
}
