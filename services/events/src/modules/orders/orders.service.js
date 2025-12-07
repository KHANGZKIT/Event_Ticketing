import { prisma } from "@app/db";
import { CheckoutSchema } from "./orders.schema.js";
import { consumeHold, getHold } from "../holds/holds.redis.service.js";
import { getSeatMap } from "../shows/shows.service.js";
import { validateCouponByCode } from "../coupons/coupons.service.js";

export async function checkout(userId, body) {
    const { holdId, couponId } = CheckoutSchema.parse(body);

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

    // Kiểm tra seatmap có hợp lệ không
    if (!sm || !sm.template || !sm.template.seats || !Array.isArray(sm.template.seats)) {
        const err = new Error("Seatmap not found or invalid for this show");
        err.status = 404;
        throw err;
    }

    const tierBySeat = new Map(sm.template.seats.map(s => [s.seatId, s.tier]));
    const priceByTier = sm.template?.priceTiers || {}; // {tier: price}

    // Tính tiền gốc
    let baseAmount = 0;
    for (const s of seatList) {
        const tier = tierBySeat.get(s);
        const price = tier != null ? priceByTier[tier] : null;
        if (price == null) {
            const err = new Error(`Seat ${s} has no price`); // ✅ dùng s
            err.status = 422;
            throw err;
        }
        baseAmount += Number(price);
    }

    // Tính discount nếu có coupon
    let discountAmount = 0;
    let validatedCoupon = null;

    if (couponId) {
        try {
            // Validate coupon by ID
            const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
            if (!coupon) {
                const err = new Error('Mã giảm giá không tồn tại');
                err.status = 404;
                throw err;
            }

            // Revalidate expiry and usage
            if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
                const err = new Error('Mã giảm giá đã hết hạn');
                err.status = 410;
                throw err;
            }

            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
                const err = new Error('Mã giảm giá đã hết lượt sử dụng');
                err.status = 410;
                throw err;
            }

            validatedCoupon = coupon;

            // Calculate discount
            if (coupon.discountType === 'percent') {
                discountAmount = Math.round(baseAmount * (coupon.discountValue / 100));
            } else if (coupon.discountType === 'fixed') {
                discountAmount = coupon.discountValue;
            }

            // Không cho discount vượt quá giá gốc
            discountAmount = Math.min(discountAmount, baseAmount);
        } catch (err) {
            // Nếu validate coupon fail, không áp dụng discount nhưng vẫn cho checkout
            console.warn('[Checkout] Coupon validation failed:', err.message);
            // Có thể throw error hoặc bỏ qua - tùy business logic
            // Ở đây tôi sẽ throw để user biết coupon invalid
            throw err;
        }
    }

    const finalAmount = baseAmount - discountAmount;

    // Tạo Order + Tickets (double-check sold)
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Double-check
            const sold = await tx.ticket.findMany({
                where: {
                    showId: hold.showId,
                    seatId: { in: seatList },
                    orderId: { not: null }
                },
                select: { seatId: true },
            });
            if (sold.length) {
                const err = new Error(`Seat sold: ${sold.map(x => x.seatId).join(",")}`);
                err.status = 409;
                throw err;
            }

            // Prepare order data
            const orderData = {
                userId,
                showId: hold.showId,
                amount: finalAmount, // Số tiền sau giảm giá
                currency: 'VND',
                status: 'pending', // Chờ payment
            };

            // Thêm coupon info nếu có
            if (validatedCoupon) {
                orderData.couponId = validatedCoupon.id;
                orderData.discountAmount = discountAmount;
            }

            // Tạo order với status 'pending' - sẽ được update thành 'paid' sau khi payment thành công
            const order = await tx.order.create({
                data: orderData,
                select: {
                    id: true, userId: true, showId: true, amount: true, currency: true, status: true, createdAt: true, couponId: true, discountAmount: true
                },
            });

            // Update tickets đã tồn tại (không tạo mới vì tickets đã được tạo khi tạo show)
            // Tickets sẽ được "activate" khi payment thành công
            const tickets = await Promise.all(
                seatList.map(async (seatId) => {
                    // Tìm ticket đã tồn tại
                    const existingTicket = await tx.ticket.findUnique({
                        where: {
                            showId_seatId: {
                                showId: hold.showId,
                                seatId: seatId,
                            },
                        },
                    });

                    if (!existingTicket) {
                        // Nếu không tìm thấy, tạo mới (fallback)
                        return await tx.ticket.create({
                            data: { showId: hold.showId, seatId, orderId: order.id },
                            select: { id: true, showId: true, seatId: true, orderId: true },
                        });
                    }

                    // Kiểm tra xem ticket đã có orderId chưa (đã được bán)
                    if (existingTicket.orderId) {
                        const err = new Error(`Seat ${seatId} already sold`);
                        err.status = 409;
                        throw err;
                    }

                    // Update ticket với orderId
                    return await tx.ticket.update({
                        where: {
                            showId_seatId: {
                                showId: hold.showId,
                                seatId: seatId,
                            },
                        },
                        data: { orderId: order.id },
                        select: { id: true, showId: true, seatId: true, orderId: true },
                    });
                })
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
