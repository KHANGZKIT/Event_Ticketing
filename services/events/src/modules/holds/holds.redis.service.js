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
export async function createHold(userId, body) {
    const { showId, seats } = CreateHoldSchema.parse(body);

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
    //    Dùng pipeline để EXISTS nhiều key một lúc
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
    // hold:<holdId>
    setPipe.set(holdKey(holdId), payload, 'EX', HOLD_TTL_SECONDS);
    // held:<showId>:<seatId>
    seats.forEach(seatId => {
        setPipe.set(heldKey(showId, seatId), holdId, 'EX', HOLD_TTL_SECONDS);
    });
    await setPipe.exec();

    return { holdId, expiresAt };
}

/**
 * Release hold (idempotent)
 * - xóa tất cả held:* theo seats của hold
 * - xóa hold:<id>
 */
export async function releaseHold(userId, holdId) {
    const h = await getHold(holdId);
    if (!h) return; // idempotent

    if (h.userId !== userId) {
        const e = new Error('Forbidden'); e.status = 403; throw e;
    }

    const delPipe = redis.pipeline();
    h.seats.forEach(seatId => delPipe.del(heldKey(h.showId, seatId)));
    delPipe.del(holdKey(holdId));
    await delPipe.exec();
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
