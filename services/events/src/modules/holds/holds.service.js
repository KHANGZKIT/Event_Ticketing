import crypto from 'node:crypto';
import { prisma } from '@app/db';
import { getSeatMap } from '../shows/shows.service.js';
import { CreateHoldSchema } from "./holds.schema.js"
const store = new Map();        // Map<holdId, { userId, showId, seats:Set, expiresAt }>
const seatLocks = new Set();    // Set<`${showId}:${seatId}`>

const key = (showId, seatId) => `${showId}:${seatId}`;

export async function createHold(userId, body) {
    const { showId, seats } = CreateHoldSchema.parse(body);

    // 1) check ghế có tồn tại trong seatmap k
    const seatmap = await getSeatMap(showId);

    const valid = new Set(seatmap.seats.map(s => s.seatId)); //
    for (const s of seats) if (!valid.has(s)) {
        const e = new Error(`Seat ${s} not found`); e.status = 404; throw e;
    }

    // 2) Ghế đã đc bán chưa
    const sold = await prisma.ticket.findMany({
        where: { showId, seatId: { in: seats } },
        select: { seatId: true }
    });

    if (sold.length) {
        const e = new Error(`Seats sold: ${sold.map(x => x.seatId).join(',')}`);
        e.status = 409; throw e;
    }

    // 3) Chưa Held bởi người khác 
    for (const s of seats) if (seatLocks.has(key(showId, s))) {
        const e = new Error(`Seat ${s} already held`);
        e.status = 409;
        throw e;
    }
    for (const s of seats) seatLocks.add(key(showId, s));

    // 4) create hold
    const holdId = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    store.set(holdId, { userId, showId, seats: new Set(seats), expiresAt });

    // auto-release
    setTimeout(() => {
        const h = store.get(holdId); if (!h) return;
        for (const s of h.seats) seatLocks.delete(key(h.showId, s));
        store.delete(holdId);
    }, 10 * 60 * 1000);

    return { holdId, expiresAt };
}

export async function releaseHold(userId, holdId) {
    const h = store.get(holdId);
    if (!h) return;                      // idempotent
    if (h.userId !== userId) {
        const e = new Error('Forbidden');
        e.status = 403;
        throw e;
    }
    for (const s of h.seats) seatLocks.delete(key(h.showId, s));
    store.delete(holdId);
}

// dùng ở checkout
export function getHold(holdId) { return store.get(holdId) || null; }
export function consumeHold(holdId) {
    const h = store.get(holdId); if (!h) return null;
    for (const s of h.seats) seatLocks.delete(key(h.showId, s));
    store.delete(holdId);
    return h;
}


export function getHeldSeatByShow(showId) {
    const seats = new Set();

    //Dang bi khoa
    for (const k of seatLocks) {
        if (k.startsWith(showId + ':')) {
            seats.add(k.split(":")[1])
        }
    }
    //Con Han
    const now = Date.now()
    for (const h of store.values()) {
        if (h.showId === showId && h.expiresAt > now) {
            for (const s of h.seats) {
                seats.add(s)
            }
        }
    }

    return seats
}
