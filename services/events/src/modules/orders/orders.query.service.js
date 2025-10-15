// services/events/src/modules/orders/orders.query.service.js
import { prisma } from "@app/db";

/** LIST: /orders/my */
export async function listMyOrders(userId, query) {
    const pageNum = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSizeNum = Math.min(Math.max(parseInt(query.pageSize, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * pageSizeNum;

    const where = { userId };

    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            skip,
            take: pageSizeNum,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                currency: true,     // ⬅️ lấy trực tiếp từ DB (cách 2)
                status: true,
                createdAt: true,
                showId: true
            }
        }),
        prisma.order.count({ where })
    ]);

    return { items, total, page: pageNum, pageSize: pageSizeNum };
}

/** DETAIL: /orders/:id */
export async function getOrderDetail(orderId, userId, roles = []) {
    const roleSet = new Set(roles);
    const isStaffLike = roleSet.has('admin') || roleSet.has('staff');

    const ord = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            userId: true,
            showId: true,
            amount: true,
            currency: true,      // ⬅️ lấy trực tiếp từ DB (cách 2)
            status: true,
            createdAt: true,
            show: {
                select: {
                    id: true,
                    startsAt: true,
                    event: { select: { id: true, name: true, city: true } }
                }
            },
            tickets: { select: { id: true, seatId: true, checkedInAt: true } }
        }
    });

    if (!ord) { const e = new Error('Order Not Found'); e.status = 404; throw e; }
    if (!isStaffLike && ord.userId !== userId) { const e = new Error('Forbidden'); e.status = 403; throw e; }

    // Ẩn userId cho user thường
    if (!isStaffLike) { const { userId: _hide, ...safe } = ord; return safe; }
    return ord;
}
