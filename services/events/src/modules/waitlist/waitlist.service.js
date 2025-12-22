/**
 * Waitlist Service
 * Business logic cho hàng đợi khi sự kiện sold-out
 */

import { prisma } from '@app/db';
import * as waitlistRedis from './waitlist.redis.js';
import { createHold } from '../holds/holds.redis.service.js';
import axios from 'axios';

const GATEWAY_INTERNAL_URL = process.env.GATEWAY_INTERNAL_URL || 'http://localhost:4000';
const OFFER_TTL_SECONDS = waitlistRedis.OFFER_TTL_SECONDS;

/**
 * Tham gia waitlist cho một show
 */
export async function joinWaitlist(userId, showId, seatCount = 1) {
    // 1. Kiểm tra show tồn tại
    const show = await prisma.show.findUnique({
        where: { id: showId },
        select: { id: true, eventId: true, status: true }
    });

    if (!show) {
        const err = new Error('Show not found');
        err.status = 404;
        throw err;
    }

    if (show.status !== 'scheduled') {
        const err = new Error('Show is not available for waitlist');
        err.status = 400;
        throw err;
    }

    // 2. Kiểm tra user đã có trong waitlist chưa
    const existing = await prisma.waitlistEntry.findUnique({
        where: { userId_showId: { userId, showId } }
    });

    if (existing && existing.status === 'waiting') {
        const position = await waitlistRedis.getPosition(showId, userId);
        return {
            alreadyJoined: true,
            position: position?.position || 1,
            total: position?.total || 1,
            joinedAt: existing.joinedAt
        };
    }

    // 3. Thêm vào Redis Sorted Set
    const added = await waitlistRedis.addToWaitlist(showId, userId, seatCount);

    if (!added) {
        const position = await waitlistRedis.getPosition(showId, userId);
        return {
            alreadyJoined: true,
            position: position?.position || 1,
            total: position?.total || 1
        };
    }

    // 4. Lưu vào DB (audit trail)
    await prisma.waitlistEntry.upsert({
        where: { userId_showId: { userId, showId } },
        create: {
            userId,
            showId,
            seatCount,
            status: 'waiting'
        },
        update: {
            seatCount,
            status: 'waiting',
            joinedAt: new Date()
        }
    });

    // 5. Lấy vị trí
    const position = await waitlistRedis.getPosition(showId, userId);

    return {
        success: true,
        position: position?.position || 1,
        total: position?.total || 1,
        seatCount
    };
}

/**
 * Rời khỏi waitlist
 */
export async function leaveWaitlist(userId, showId) {
    // 1. Xóa khỏi Redis
    await waitlistRedis.removeFromWaitlist(showId, userId);

    // 2. Xóa offer nếu có
    await waitlistRedis.deleteOffer(showId, userId);

    // 3. Cập nhật DB
    await prisma.waitlistEntry.updateMany({
        where: { userId, showId, status: { in: ['waiting', 'offered'] } },
        data: { status: 'cancelled' }
    });

    return { success: true };
}

/**
 * Lấy vị trí hiện tại trong queue
 */
export async function getWaitlistPosition(userId, showId) {
    const position = await waitlistRedis.getPosition(showId, userId);

    if (!position) {
        // Kiểm tra DB xem có offer đang pending không
        const entry = await prisma.waitlistEntry.findUnique({
            where: { userId_showId: { userId, showId } }
        });

        if (entry?.status === 'offered') {
            const offer = await waitlistRedis.getOffer(showId, userId);
            return {
                status: 'offered',
                offer,
                message: 'Bạn đang có offer! Hãy accept trong thời gian cho phép.'
            };
        }

        return null;
    }

    return {
        status: 'waiting',
        position: position.position,
        total: position.total
    };
}

/**
 * Xử lý khi có seats được release (gọi từ holds.releaseHold)
 * Offer cho người đầu tiên trong queue
 */
export async function processAvailableSeats(showId, seats) {
    if (!seats || seats.length === 0) return null;

    // 1. Lấy người đầu tiên trong queue
    const next = await waitlistRedis.popNext(showId);

    if (!next) {
        console.log('[waitlist] No one in queue for showId:', showId);
        return null;
    }

    const { userId, seatCount } = next;

    // 2. Xác định số ghế offer (lấy min giữa seats available và seatCount user muốn)
    const seatsToOffer = seats.slice(0, Math.min(seats.length, seatCount));

    // 3. Tạo offer với TTL
    const expiresAt = Date.now() + OFFER_TTL_SECONDS * 1000;
    const offer = await waitlistRedis.createOffer(showId, userId, seatsToOffer, expiresAt);

    // 4. Cập nhật DB
    await prisma.waitlistEntry.update({
        where: { userId_showId: { userId, showId } },
        data: {
            status: 'offered',
            offeredAt: new Date(),
            expiresAt: new Date(expiresAt)
        }
    });

    // 5. Gửi thông báo WebSocket
    try {
        await axios.post(`${GATEWAY_INTERNAL_URL}/internal/ws/waitlist-offer`, {
            userId,
            showId,
            seats: seatsToOffer,
            expiresAt
        });
    } catch (err) {
        console.error('[waitlist] WS notify failed:', err.message);
    }

    console.log('[waitlist] Offer created for user:', userId, 'seats:', seatsToOffer);

    return { userId, seats: seatsToOffer, expiresAt };
}

/**
 * Accept offer - tạo hold và chuyển sang checkout
 */
export async function acceptOffer(userId, showId) {
    // 1. Kiểm tra offer còn valid không
    const offer = await waitlistRedis.getOffer(showId, userId);

    if (!offer) {
        // Kiểm tra DB xem offer đã expired chưa
        const entry = await prisma.waitlistEntry.findUnique({
            where: { userId_showId: { userId, showId } }
        });

        if (entry?.status === 'expired') {
            const err = new Error('Offer đã hết hạn');
            err.status = 410; // Gone
            throw err;
        }

        const err = new Error('Không tìm thấy offer');
        err.status = 404;
        throw err;
    }

    // 2. Xóa offer
    await waitlistRedis.deleteOffer(showId, userId);

    // 3. Tạo hold cho các seats
    const holdResult = await createHold(userId, {
        showId,
        seats: offer.seats
    });

    if (!holdResult.ok) {
        // Nếu hold fail (seats đã bị sold), thử offer cho người tiếp theo
        await processAvailableSeats(showId, offer.seats);

        const err = new Error('Seats không còn available. Đã offer cho người tiếp theo trong queue.');
        err.status = 409;
        throw err;
    }

    // 4. Cập nhật DB
    await prisma.waitlistEntry.update({
        where: { userId_showId: { userId, showId } },
        data: { status: 'accepted' }
    });

    return {
        success: true,
        holdId: holdResult.holdId,
        seats: offer.seats,
        expiresAt: holdResult.expiresAt,
        message: 'Offer accepted! Tiến hành checkout.'
    };
}

/**
 * Decline offer - từ chối và offer cho người tiếp theo
 */
export async function declineOffer(userId, showId) {
    // 1. Lấy offer
    const offer = await waitlistRedis.getOffer(showId, userId);

    if (!offer) {
        return { success: true, message: 'No offer to decline' };
    }

    // 2. Xóa offer
    await waitlistRedis.deleteOffer(showId, userId);

    // 3. Cập nhật DB
    await prisma.waitlistEntry.update({
        where: { userId_showId: { userId, showId } },
        data: { status: 'cancelled' }
    });

    // 4. Offer cho người tiếp theo
    await processAvailableSeats(showId, offer.seats);

    return { success: true, message: 'Offer declined. Đã offer cho người tiếp theo.' };
}

/**
 * Kiểm tra và xử lý offer hết hạn (gọi bằng cron hoặc khi check)
 */
export async function handleExpiredOffer(userId, showId) {
    const entry = await prisma.waitlistEntry.findUnique({
        where: { userId_showId: { userId, showId } }
    });

    if (!entry || entry.status !== 'offered') return;

    // Check nếu offer vẫn còn trong Redis
    const offerValid = await waitlistRedis.isOfferValid(showId, userId);

    if (!offerValid && entry.expiresAt && new Date() > entry.expiresAt) {
        // Offer đã hết hạn
        await prisma.waitlistEntry.update({
            where: { userId_showId: { userId, showId } },
            data: { status: 'expired' }
        });

        // NOTE: Không tự động offer cho người tiếp theo ở đây
        // vì seats có thể đã được release bởi process khác
    }
}

/**
 * Lấy danh sách waitlist entries cho một show (admin)
 */
export async function getShowWaitlist(showId) {
    const entries = await prisma.waitlistEntry.findMany({
        where: { showId },
        orderBy: { joinedAt: 'asc' }
    });

    const redisCount = await waitlistRedis.getWaitlistCount(showId);

    return {
        entries,
        activeCount: redisCount
    };
}
