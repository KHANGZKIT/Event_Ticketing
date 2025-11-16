import { prisma } from "@app/db";

export async function findUsers({ page, size, search }) {
    const where = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } }
        ];
    }

    const [raw, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip: (page - 1) * size,
            take: size,
            orderBy: { createdAt: "desc" },
            select: {
                id: true, email: true, fullName: true, createdAt: true,
                orders: { select: { id: true, amount: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { orders: true } }
            }
        }),
        prisma.user.count({ where })
    ]);

    // map thêm fields tổng quát cho dashboard
    const items = raw.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        createdAt: u.createdAt,
        ordersCount: u._count.orders,
        lastOrderAt: u.orders[0]?.createdAt || null,
        lastOrderId: u.orders[0]?.id || null,
        lastOrderAmount: u.orders[0]?.amount || 0,
    }));

    return { items, total, page, pageSize: size };
}
