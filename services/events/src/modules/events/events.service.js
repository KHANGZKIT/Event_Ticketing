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

export async function createEvent(data) {

    return prisma.event.create({
        data: {
            ...data,
            startsAt: data.startsAt ? new Date(data.startsAt) : null,
        },
        select: { id: true, name: true, city: true, startsAt: true, cover: true, createdAt: true, updatedAt: true }
    });
}

export async function updateEvent(id, data) {

    const exsits = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true }
    })

    if (!exsits) {
        const e = new Error('Event not found');
        e.status = 404;
        throw e;
    }
    return prisma.event.update({
        where: { id },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.city !== undefined ? { city: data.city } : {}),
            ...(data.cover !== undefined ? { cover: data.cover } : {}),
            ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {})
        },
        select: { id: true, name: true, city: true, cover: true, startsAt: true, createdAt: true, updatedAt: true }
    });
}

export async function deleteEvent(id) {

    const exists = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true }
    });
    if (!exists) {
        const e = new Error('Event not found');
        e.status = 404;
        throw e;
    }
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
}