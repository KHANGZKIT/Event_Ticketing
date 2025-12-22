/**
 * Waitlist Redis Operations
 * Sử dụng Redis Sorted Set để quản lý hàng đợi
 * 
 * Keys:
 * - waitlist:<showId>                    → Sorted Set (score = timestamp)
 * - waitlist:offer:<showId>:<userId>     → String with TTL (offer details JSON)
 */

import { redis } from '../../redis/client.js';

const OFFER_TTL_SECONDS = 600; // 10 phút

// Key patterns
const waitlistKey = (showId) => `waitlist:${showId}`;
const offerKey = (showId, userId) => `waitlist:offer:${showId}:${userId}`;

/**
 * Thêm user vào waitlist (Sorted Set với score = timestamp)
 * @returns {boolean} true nếu thêm mới, false nếu đã tồn tại
 */
export async function addToWaitlist(showId, userId, seatCount = 1) {
    const key = waitlistKey(showId);
    const score = Date.now();
    const member = JSON.stringify({ userId, seatCount });

    // ZADD NX: chỉ thêm nếu chưa tồn tại
    const added = await redis.zadd(key, 'NX', score, member);
    return added > 0;
}

/**
 * Xóa user khỏi waitlist
 * @returns {boolean} true nếu xóa thành công
 */
export async function removeFromWaitlist(showId, userId) {
    const key = waitlistKey(showId);

    // Cần tìm member có userId tương ứng
    const members = await redis.zrange(key, 0, -1);
    for (const member of members) {
        try {
            const parsed = JSON.parse(member);
            if (parsed.userId === userId) {
                const removed = await redis.zrem(key, member);
                return removed > 0;
            }
        } catch {
            continue;
        }
    }
    return false;
}

/**
 * Lấy vị trí của user trong queue (1-indexed)
 * @returns {{ position: number, total: number } | null}
 */
export async function getPosition(showId, userId) {
    const key = waitlistKey(showId);
    const members = await redis.zrange(key, 0, -1);

    let position = null;
    for (let i = 0; i < members.length; i++) {
        try {
            const parsed = JSON.parse(members[i]);
            if (parsed.userId === userId) {
                position = i + 1;
                break;
            }
        } catch {
            continue;
        }
    }

    return position !== null ? { position, total: members.length } : null;
}

/**
 * Lấy số người đang chờ trong queue
 */
export async function getWaitlistCount(showId) {
    const key = waitlistKey(showId);
    return await redis.zcard(key);
}

/**
 * Lấy người đầu tiên trong queue (không xóa)
 * @returns {{ userId: string, seatCount: number } | null}
 */
export async function peekNext(showId) {
    const key = waitlistKey(showId);
    const result = await redis.zrange(key, 0, 0);

    if (!result || result.length === 0) return null;

    try {
        return JSON.parse(result[0]);
    } catch {
        return null;
    }
}

/**
 * Pop người đầu tiên khỏi queue
 * @returns {{ userId: string, seatCount: number } | null}
 */
export async function popNext(showId) {
    const key = waitlistKey(showId);

    // ZPOPMIN: atomic pop phần tử có score nhỏ nhất
    const result = await redis.zpopmin(key, 1);

    if (!result || result.length === 0) return null;

    // result = [member, score] hoặc [[member, score]] tùy redis client version
    const member = Array.isArray(result[0]) ? result[0][0] : result[0];

    try {
        return JSON.parse(member);
    } catch {
        return null;
    }
}

/**
 * Tạo offer cho user (lưu với TTL)
 */
export async function createOffer(showId, userId, seats, expiresAt) {
    const key = offerKey(showId, userId);
    const payload = JSON.stringify({
        showId,
        userId,
        seats,
        createdAt: Date.now(),
        expiresAt,
    });

    await redis.set(key, payload, 'EX', OFFER_TTL_SECONDS);
    return { showId, userId, seats, expiresAt };
}

/**
 * Lấy offer hiện tại của user
 */
export async function getOffer(showId, userId) {
    const key = offerKey(showId, userId);
    const raw = await redis.get(key);

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Xóa offer (khi accept hoặc decline)
 */
export async function deleteOffer(showId, userId) {
    const key = offerKey(showId, userId);
    return await redis.del(key);
}

/**
 * Kiểm tra offer còn valid không
 */
export async function isOfferValid(showId, userId) {
    const key = offerKey(showId, userId);
    const ttl = await redis.ttl(key);
    return ttl > 0;
}

export { OFFER_TTL_SECONDS };
