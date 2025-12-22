import crypto from 'node:crypto';
import { prisma } from '@app/db';
import { redis } from '../../redis/client.js';
import { CreateHoldSchema } from './holds.schema.js';
import { getSeatMap } from '../shows/shows.service.js';
import { incrMetric } from '../../metrics/metrics.js';
import { logx } from '../../utils/logx.js';
import axios from 'axios';   // ⬅️ THÊM DÒNG NÀY
import * as waitlistService from '../waitlist/waitlist.service.js';

const GATEWAY_INTERNAL_URL =
    process.env.GATEWAY_INTERNAL_URL || "http://localhost:4000";
const HOLD_TTL_SECONDS = Number(process.env.HOLD_TTL_SECONDS || 600); // 15 minutes default

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
        try {
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
        } catch (e) {
            console.error('[holds.create] idempotency check error:', e);
            // Tiếp tục tạo hold mới nếu idempotency check lỗi
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
        console.log('[holds.create] Fetching seatmap for showId:', showId);
        const seatmap = await getSeatMap(showId);
        console.log('[holds.create] Seatmap response:', {
            hasSeatmap: !!seatmap,
            hasTemplate: !!seatmap?.template,
            hasSeats: !!seatmap?.template?.seats,
            seatsCount: seatmap?.template?.seats?.length || 0
        });

        // getSeatMap trả về { showId, template: { ...tpl, seats: [...] } }
        const seatmapSeats = seatmap?.template?.seats || seatmap?.seats || [];
        if (!seatmap || !Array.isArray(seatmapSeats) || seatmapSeats.length === 0) {
            const e = new Error(`Seatmap not found or invalid for showId: ${showId}. Show may not have a seatmap assigned.`);
            e.status = 404;
            logx('holds.create.seatmap_not_found', { userId, showId, seatmap: !!seatmap, hasTemplate: !!seatmap?.template }, 'error');
            throw e;
        }
        const valid = new Set(seatmapSeats.map(s => s.seatId || s.label || s.id));
        console.log('[holds.create] Valid seats:', Array.from(valid).slice(0, 10), '... (total:', valid.size, ')');

        // Normalize request seats: extract seatId if objects, otherwise use as-is
        const requestSeatIds = seats.map(s => {
            if (typeof s === 'string') return s;
            if (typeof s === 'object' && s !== null) return s.seatId || s.label || s.id || String(s);
            return String(s);
        });

        for (const seatId of requestSeatIds) {
            if (!valid.has(seatId)) {
                const e = new Error(`Seat ${seatId} not found in seatmap`);
                e.status = 404;
                logx('holds.create.invalid_seat', { userId, showId, seat: seatId, validSeats: Array.from(valid).slice(0, 5) }, 'warn');
                throw e;
            }
        }

        const sold = await prisma.ticket.findMany({
            where: {
                showId,
                seatId: { in: requestSeatIds },
                orderId: { not: null }
            },
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
        requestSeatIds.forEach(seatId => existsPipe.exists(heldKey(showId, seatId)));
        const existsRes = await existsPipe.exec();
        const alreadyHeld = requestSeatIds.filter((_, i) => (existsRes[i]?.[1] || 0) > 0);
        if (alreadyHeld.length) {
            await incrMetric('create:conflict');
            logx('holds.create.conflict', { userId, showId, seats: requestSeatIds, conflicts: alreadyHeld }, 'warn');
            const e = new Error(`Seat(s) already held: ${alreadyHeld.join(',')}`);
            e.status = 409;
            e.conflicts = alreadyHeld; // Thêm conflicts array vào error
            throw e;
        }

        const holdId = crypto.randomUUID();
        const expiresAt = Date.now() + HOLD_TTL_SECONDS * 1000;
        const payload = JSON.stringify({ userId, showId, seats: requestSeatIds, expiresAt });

        console.log('[holds.create] Creating Redis pipeline for holdId:', holdId);
        const setPipe = redis.pipeline();
        setPipe.set(holdKey(holdId), payload, 'EX', HOLD_TTL_SECONDS);
        requestSeatIds.forEach(seatId => {
            setPipe.set(heldKey(showId, seatId), holdId, 'EX', HOLD_TTL_SECONDS);
        });
        console.log('[holds.create] Executing pipeline...');
        const out = await setPipe.exec();
        console.log('[holds.create] Pipeline result:', out);
        if (!out || out.some(([err]) => err)) {
            const errors = out?.filter(([err]) => err) || [];
            console.error('[holds.create] Pipeline errors:', errors);
            await incrMetric('create:tx_failed');
            logx('holds.create.tx_failed', { userId, showId, seats: requestSeatIds, out, errors }, 'error');
            return { ok: false, reason: 'tx-failed', out, errors };
        }

        if (idemRedisKey) {
            await redis.set(idemRedisKey, holdId, 'EX', HOLD_TTL_SECONDS);
        }

        await incrMetric('create:ok');
        logx('holds.create.ok', { userId, showId, holdId, seats: requestSeatIds, expiresAt });

        // 🔔 Gửi thông báo WebSocket qua gateway
        try {
            await axios.post(`${GATEWAY_INTERNAL_URL}/internal/ws/seat-updated`, {
                showId,
                seats: requestSeatIds,
                status: "HELD",
                holdId,
                expiresAt,
            });
        } catch (err) {
            console.error("[holds.create] WS notify failed:", err.message);
            // không throw, hold vẫn thành công, chỉ là không realtime
        }

        return { ok: true, holdId, expiresAt };
    } catch (err) {
        if (reserved && idemRedisKey) {
            try { await redis.del(idemRedisKey); } catch { }
        }
        logx('holds.create.error', { userId, showId, message: err?.message, stack: err?.stack }, 'error');
        // Nếu là lỗi Redis connection, trả về lỗi rõ ràng hơn
        if (err?.message?.includes('ECONNREFUSED') || err?.message?.includes('connect') || err?.code === 'ECONNREFUSED') {
            const e = new Error('Redis connection failed. Please ensure Redis is running.');
            e.status = 503;
            throw e;
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

    try {
        await axios.post(`${GATEWAY_INTERNAL_URL}/internal/ws/seat-updated`, {
            showId: h.showId,
            seats: h.seats,
            status: "RELEASED",
            holdId,
        });
    } catch (err) {
        console.error("[holds.release] WS notify failed:", err.message);
    }

    // 🆕 Trigger waitlist - offer seats to next person in queue
    try {
        await waitlistService.processAvailableSeats(h.showId, h.seats);
    } catch (err) {
        console.error("[holds.release] Waitlist trigger failed:", err.message);
        // Non-blocking, continue with release
    }

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
