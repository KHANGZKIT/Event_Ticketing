import { prisma } from '@app/db';


export async function listEvents(query) {
    const { q, city, page = "1", pageSize = "10" } = query;
    const take = Math.min(parseInt(pageSize) || 10, 50);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
    const where = {
        ...(city ? { city } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
    };

    const [items, total] = await Promise.all([
        prisma.event.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        prisma.event.count({ where })
    ]);

    return { items, total, page: Number(page), pageSize: take };
}


export async function getEvent(id) {
    const ev = prisma.event.findUnique({ where: { id } });
    if (!ev) {
        const e = new Error('Event not found');
        e.status = 404;
        throw e;
    }
    return ev;
}

export async function listShowsOfEvent(eventId, query) {
    const { from, to } = query;
    const where = {
        eventId,          // lọc các bản ghi có eventId đúng
        ...(from || to    // nếu có from hoặc to thì mới thêm block thời gian
            ? {
                startsAt: { // (field thời gian trong DB)
                    gte: from ? new Date(from) : undefined, // nếu có from → >= from
                    lte: to ? new Date(to) : undefined, // nếu có to   → <= to
                }
            }
            : {}
        )
    };

    return prisma.show.findMany({ where, orderBy: { startsAt: 'asc' } });
}