import { prisma } from "@app/db";

/** GET /events */
export async function listEvents(query) {
    const { q, city, page = "1", pageSize = "10" } = query;
    const take = Math.min(parseInt(pageSize) || 10, 50);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where = {
        deletedAt: null,
        ...(city ? { city } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
        prisma.event.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                city: true,
                cover: true,
                startsAt: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        shows: {
                            where: {
                                deletedAt: null,
                                status: "scheduled",
                                startsAt: { gte: new Date() },
                            },
                        },
                    },
                },
                shows: {
                    where: {
                        deletedAt: null,
                        status: "scheduled",
                        startsAt: { gte: new Date() },
                    },
                    orderBy: { startsAt: "asc" },
                    take: 1,
                    select: { startsAt: true },
                },
            },
        }),
        prisma.event.count({ where }),
    ]);

    const normalized = items.map((e) => ({
        ...e,
        upcomingCount: e._count.shows,
        minStartsAt: e.shows[0]?.startsAt ?? null,
    }));

    return { items: normalized, total, page: Number(page), pageSize: take };
}

/** GET /events/:id */
export async function getEvent(id) {
    const ev = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: {
            id: true,
            name: true,
            city: true,
            cover: true,
            startsAt: true,
            venueId: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!ev) {
        const e = new Error("Event not found");
        e.status = 404;
        throw e;
    }
    return ev;
}

/** GET /events/:id/shows */
export async function listShowsOfEvent(eventId, query) {
    const { from, to, days } = query;

    let gte = from ? new Date(from) : undefined;
    let lte = to ? new Date(to) : undefined;

    if (!from && !to && days) {
        const now = new Date();
        const end = new Date();
        end.setDate(end.getDate() + Number(days));
        gte = now;
        lte = end;
    }

    return prisma.show.findMany({
        where: {
            eventId,
            deletedAt: null,
            status: "scheduled",
            ...(gte || lte ? { startsAt: { gte, lte } } : {}),
        },
        orderBy: { startsAt: "asc" },
        select: {
            id: true,
            startsAt: true,
            venue: true,
            seatMapId: true,
            status: true,
        },
    });
}

/** POST /events */
export async function createEvent(data) {
    return prisma.event.create({
        data: {
            name: data.name,
            city: data.city ?? null,
            cover: data.cover ?? null,
            startsAt: data.startsAt ? new Date(data.startsAt) : null,
            venueId: data.venueId ?? null, // nếu FE gửi kèm
        },
        select: {
            id: true,
            name: true,
            city: true,
            startsAt: true,
            cover: true,
            venueId: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

/** PATCH /events/:id */
export async function updateEvent(id, data) {
    const exists = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!exists) {
        const e = new Error("Event not found");
        e.status = 404;
        throw e;
    }

    return prisma.event.update({
        where: { id },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.city !== undefined ? { city: data.city } : {}),
            ...(data.cover !== undefined ? { cover: data.cover } : {}),
            ...(data.startsAt !== undefined
                ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
                : {}),
            ...(data.venueId !== undefined ? { venueId: data.venueId } : {}),
        },
        select: {
            id: true,
            name: true,
            city: true,
            cover: true,
            startsAt: true,
            venueId: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

/** DELETE /events/:id (soft delete) */
export async function deleteEvent(id) {
    const exists = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!exists) {
        const e = new Error("Event not found");
        e.status = 404;
        throw e;
    }
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
}
