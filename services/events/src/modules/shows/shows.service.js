import { prisma } from '@app/db';
export async function getShow(id) {
    const s = await prisma.show.findUnique({ where: { id } });
    if (!s) { const e = new Error('Show not found'); e.status = 404; throw e; }
    return s;
}

export async function createShow(data) {
    const ev = await prisma.event.findFirst({
        where: { id: data.eventId, deletedAt: null },
        select: { id: true }
    })

    if (!ev) {
        const e = new Error('Event Not Found');
        e.status = 404;
        throw e;
    }

    return prisma.show.create({
        data: {
            eventId: data.eventId,
            startsAt: new Date(data.startsAt),
            venue: data.venue ?? null,
            seatMapId: data.seatMapId ?? null
        }
    })
}

export async function updateShow(id, data) {
    const s = await prisma.show.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!s) {
        const e = new Error('Show not found');
        e.status = 404;
        throw e;
    };

    return prisma.show.update({
        where: { id },
        select: {
            ...(data.eventId ? { eventId: data.eventId } : {}),
            ...(data.startsAt !== undefined ? { startsAt: new Date(data.startsAt) } : {}),
            ...(data.venue !== undefined ? { venue: data.venue } : {}),
            ...(data.seatMapId !== undefined ? { seatMapId: data.seatMapId } : {})
        }
    });
}

export async function deleteShow(id) {
    const s = await prisma.show.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!s) {
        const e = new Error('Show not found');
        e.status = 404;
        throw e;
    }
    await prisma.show.update({ where: { id }, data: { deletedAt: new Date() } });
}

