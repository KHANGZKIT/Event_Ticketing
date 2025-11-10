import { prisma } from "@app/db";

/** GET /events */
export async function listEvents(query) {

    // Đọc tất cả query
    const { q, city, category, page = "1", pageSize = "10" } = query;

    const take = Math.min(Number.parseInt(pageSize) || 10, 50);
    const skip = (Math.max(Number.parseInt(page) || 1, 1) - 1) * take;

    // SỬA: Xây dựng 'whereEvent' KHÔNG CÓ 'q'
    const whereEvent = {
        deletedAt: null,
        ...(city ? { city } : {}),
        ...(category ? { category: category } : {}),
    };

    if (q) {
        // Giờ nó sẽ tìm (name HOẶC category) chứa 'q'
        whereEvent.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
        ];
    }

    // 1) Lấy page events
    const [events, total] = await Promise.all([
        prisma.event.findMany({
            where: whereEvent, // 'whereEvent' giờ đã chính xác
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
                category: true, // Giờ dòng này đã an toàn
            },
        }),
        prisma.event.count({ where: whereEvent }),
    ]);

    if (events.length === 0) {
        return { items: [], total, page: Number(page), pageSize: take };
    }

    const eventIds = events.map(e => e.id);
    const now = new Date();

    // 2) Lấy count shows (Giữ nguyên)
    const counts = await prisma.show.groupBy({
        by: ["eventId"],
        where: {
            eventId: { in: eventIds },
            deletedAt: null,
            status: "scheduled",
            startsAt: { gte: now },
        },
        _count: { _all: true },
    });

    // 3) Lấy min(startsAt) (Giữ nguyên)
    const mins = await prisma.show.groupBy({
        by: ["eventId"],
        where: {
            eventId: { in: eventIds },
            deletedAt: null,
            status: "scheduled",
            startsAt: { gte: now },
        },
        _min: { startsAt: true },
    });

    const countMap = new Map(counts.map(c => [c.eventId, c._count._all]));
    const minMap = new Map(mins.map(m => [m.eventId, m._min.startsAt || null]));

    const items = events.map(e => ({
        ...e,
        upcomingCount: countMap.get(e.id) ?? 0,
        minStartsAt: minMap.get(e.id) ?? null,
    }));

    return { items, total, page: Number(page), pageSize: take };
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
