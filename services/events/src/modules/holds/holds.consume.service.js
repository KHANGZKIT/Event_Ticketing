import { prisma } from '@app/db';
import { getRedis } from '../../redis/client.js';
import { getHold, consumeHold } from './holds.redis.service.js';
import { incrMetric } from '../../metrics/metrics.js';
import { logx } from '../../utils/logx.js';

const IDEM_PREFIX = 'idem:consume:';   // idem:consume:<userId>:<key>
const IDEM_TTL = 600;                  // 10 phút

export async function consumeHoldService({ userId, holdId, idemKey }) {
    const r = getRedis();

    // 1) Idempotency read-through
    let idemRedisKey = null;
    if (idemKey) {
        idemRedisKey = `${IDEM_PREFIX}${userId}:${idemKey}`;
        const mapped = await r.get(idemRedisKey);            // orderId hoặc 'PENDING' hoặc null
        if (mapped && mapped !== 'PENDING') {
            const order = await prisma.order.findUnique({
                where: { id: mapped },
                select: { id: true }
            });
            if (order) {
                logx('holds.consume.idempotent.hit', { userId, holdId, orderId: order.id });
                return { ok: true, orderId: order.id, idempotent: true };
            }
        }
        const ok = await r.set(idemRedisKey, 'PENDING', 'NX', 'EX', IDEM_TTL);
        if (!ok) {
            const e = new Error('Idempotency busy'); e.status = 409; throw e;
        }
    }

    // 2) Đọc hold từ Redis
    const h = await getHold(holdId);     // { userId, showId, seats:Set, expiresAt } | null
    if (!h) { const e = new Error('Hold not found or expired'); e.status = 404; throw e; }
    if (h.userId !== userId) { const e = new Error('Forbidden'); e.status = 403; throw e; }

    const seatsArr = Array.from(h.seats || []);
    if (seatsArr.length === 0) { const e = new Error('Empty hold'); e.status = 422; throw e; }

    // 3) Transaction DB: chặn trùng vé và tạo order + tickets
    const result = await prisma.$transaction(async (tx) => {
        const sold = await tx.ticket.findMany({
            where: { showId: h.showId, seatId: { in: seatsArr }, orderId: { not: null } },
            select: { seatId: true }
        });
        if (sold.length) {
            const e = new Error(`Seats already sold: ${sold.map(x => x.seatId).join(',')}`);
            e.status = 409; throw e;
        }

        // TODO: tính amount thực tế theo price tiers của bạn
        const order = await tx.order.create({
            data: {
                userId,
                showId: h.showId,
                amount: 0,
                currency: 'VND',
                status: 'paid'
            },
            select: { id: true }
        });

        await tx.ticket.createMany({
            data: seatsArr.map(seatId => ({
                showId: h.showId,
                orderId: order.id,
                seatId
            }))
        });

        return { orderId: order.id };
    });

    // 4) Xoá các key Redis: held:* + hold:<id> (idempotent)
    await consumeHold(holdId);

    // 5) Ghi idempotency mapping
    if (idemRedisKey) await r.set(idemRedisKey, result.orderId, 'EX', IDEM_TTL);

    await incrMetric('consume:ok');
    logx('holds.consume.ok', { userId, holdId, orderId: result.orderId, seats: seatsArr });

    return { ok: true, orderId: result.orderId, seats: seatsArr };
}
