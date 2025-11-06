import { prisma } from "@app/db";

export async function buildTicketsSummary({ showId, hours }) {
    const since = new Date(Date.now() - hours * 3600 * 1000);

    // (1) Counters
    const [total, sold, checkedIn] = await Promise.all([
        prisma.ticket.count({ where: { showId } }),
        prisma.ticket.count({ where: { showId, NOT: { orderId: null } } }),
        prisma.ticket.count({ where: { showId, NOT: { checkedInAt: null } } }),
    ]);

    // (2) Time series theo giờ (binning phía ứng dụng – gọn & nhanh)
    const rows = await prisma.ticket.findMany({
        where: { showId, createdAt: { gte: since } },
        select: { createdAt: true, orderId: true },
        orderBy: { createdAt: "asc" },
    });

    const bins = new Map(); // key ISO-8601 floored-to-hour
    for (const r of rows) {
        const t = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
        const floored = new Date(Math.floor(t.getTime() / 3600000) * 3600000).toISOString();
        const cur = bins.get(floored) || { t: floored, created: 0, sold: 0 };
        cur.created += 1;
        if (r.orderId) cur.sold += 1;
        bins.set(floored, cur);
    }
    const series = Array.from(bins.values()).sort((a, b) => a.t.localeCompare(b.t));

    return { showId, since, total, sold, checkedIn, series };
}

export async function findTickets({ showId, status, search, page = 1, size = 20, order = 'desc' }) {
    const where = {};
    if (showId) where.showId = showId;

    if (status === 'sold') where.orderId = { not: null };
    else if (status === 'unsold') where.orderId = null;
    else if (status === 'checkedin') where.checkedInAt = { not: null };

    if (search) {
        where.OR = [
            { seatId: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            skip: (page - 1) * size,
            take: size,
            orderBy: { createdAt: order },
            select: {
                id: true, showId: true, seatId: true, code: true,
                orderId: true, checkedInAt: true, createdAt: true,
                show: { select: { event: { select: { name: true } } } },
            },
        }),
        prisma.ticket.count({ where }),
    ]);

    // map gọn cho FE
    const mapped = items.map(x => ({
        id: x.id,
        showId: x.showId,
        seatId: x.seatId,
        code: x.code,
        status: x.orderId ? 'sold' : 'issued',
        checkedInAt: x.checkedInAt,
        createdAt: x.createdAt,
        eventName: x.show?.event?.name || null,
    }));

    return { items: mapped, total, page, pageSize: size };
}
