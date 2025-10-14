import { prisma } from "@app/db";
import { CheckoutSchema } from "./orders.schema.js";
import { consumeHold, getHold } from "../holds/holds.service.js";
import { getSeatMap } from "../shows/shows.service.js";

export async function checkout(userId, body) {
    const { holdId } = CheckoutSchema.parse(body);

    // ✅ Lấy hold phải await
    const hold = await getHold(holdId);
    if (!hold) {
        const err = new Error("Hold is not found");
        err.status = 410; // hoặc 404 tuỳ quy ước
        throw err;
    }
    if (hold.userId !== userId) {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    // (tuỳ bạn) kiểm tra trạng thái/expiry của hold
    // if (hold.status !== 'HELD' || hold.expiresAt <= new Date()) { ... }

    // ✅ seats: Set/Array đều xử lý
    const seats = hold.seats;
    const seatList = Array.isArray(seats) ? seats : Array.from(seats || []);
    if (!seatList.length) {
        const err = new Error("No seats");
        err.status = 400;
        throw err;
    }

    // Lấy seat map
    const sm = await getSeatMap(hold.showId);
    const tierBySeat = new Map(sm.seats.map(s => [s.seatId, s.tier]));
    const priceByTier = sm.template?.priceTiers || {}; // {tier: price}

    // Tính tiền
    let amount = 0;
    for (const s of seatList) {
        const tier = tierBySeat.get(s);
        const price = tier != null ? priceByTier[tier] : null;
        if (price == null) {
            const err = new Error(`Seat ${s} has no price`); // ✅ dùng s
            err.status = 422;
            throw err;
        }
        amount += Number(price);
    }

    // Tạo Order + Tickets (double-check sold)
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Double-check
            const sold = await tx.ticket.findMany({
                where: { showId: hold.showId, seatId: { in: seatList } },
                select: { seatId: true },
            });
            if (sold.length) {
                const err = new Error(`Seat sold: ${sold.map(x => x.seatId).join(",")}`);
                err.status = 409;
                throw err;
            }

            // Tạo order (tuỳ bạn có thể để 'pending' rồi qua payment mới set 'paid')
            const order = await tx.order.create({
                data: {
                    userId,
                    showId: hold.showId,
                    amount,
                    status: 'paid', // hoặc 'pending'
                },
                select: {
                    id: true, userId: true, showId: true, amount: true, status: true, createdAt: true
                },
            });

            // Tạo tickets
            const tickets = await Promise.all(
                seatList.map(seatId =>
                    tx.ticket.create({
                        data: { showId: hold.showId, seatId, orderId: order.id },
                        select: { id: true, showId: true, seatId: true, orderId: true },
                    })
                )
            );

            // (Khuyến nghị) cập nhật hold trong chính transaction nếu hold ở DB
            // await tx.hold.update({ where: { id: holdId }, data: { status: 'CONSUMED', consumedAt: new Date() }});

            return { order, tickets };
        });

        // Nếu consumeHold là async ngoài DB ⇒ nhớ await
        await consumeHold(holdId);

        // ✅ return để controller gửi response
        return { ok: true, order: result.order, tickets: result.tickets };

    } catch (e) {
        if (e?.code === 'P2002') {
            const err = new Error('Some seats were just sold by someone else');
            err.status = 409;
            throw err;
        }
        throw e;
    }
}
