import { prisma } from '@app/db';
import fs from 'node:fs/promises';
import path from 'node:path';

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

async function loadSeatMapTemplate(seatMapId) {
    try {
        const file = path.resolve(process.cwd(), '../../packages/db/seatmaps', `${seatMapId}.json`);
        const content = await fs.readFile(file, 'utf-8');
        const tpl = JSON.parse(content);

        // Validate tối thiểu
        if (!tpl || !Array.isArray(tpl.zones)) {
            const e = new Error('Invalid seatmap template: zones missing'); e.status = 500; throw e;
        }
        for (const [i, z] of tpl.zones.entries()) {
            if (!Array.isArray(z.rows)) {
                const e = new Error(`Invalid seatmap template: zones[${i}].rows missing`); e.status = 500; throw e;
            }
        }
        return tpl;
    } catch (err) {
        if (err?.code === 'ENOENT') {
            const e = new Error(`Seatmap template not found: ${seatMapId}`); e.status = 404; throw e;
        }
        throw err;
    }
}

function expandSeatsFromTemplate(tpl) {
    const seats = [];
    for (const z of tpl.zones) {
        const tier = z.id; // đơn giản: tier = zone
        // ✅ dùng z.rows (KHÔNG phải 'rows')
        for (const r of z.rows) {
            const from = Number(r.from);
            const to = Number(r.to);
            if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to) {
                // bỏ qua row xấu để tránh crash
                continue;
            }
            for (let n = from; n <= to; n++) {
                seats.push({ seatId: `${r.id}${n}`, zone: z.id, tier });
            }
        }
    }
    return seats;
}

export async function getSeatMap(showId) {
    const show = await prisma.show.findFirst({
        where: { id: showId, deletedAt: null },
        select: { id: true, seatMapId: true },
    });

    if (!show || !show.seatMapId) {
        const e = new Error("SeatMap Not Found");
        e.status = 404;
        throw e;
    }

    const tpl = await loadSeatMapTemplate(show.seatMapId);

    return {
        showId: show.id,
        template: tpl,
        seats: expandSeatsFromTemplate(tpl),
    };
}

export async function getAvailability(showId, redis) {
    const show = await prisma.show.findFirst({
        where: { id: showId, deletedAt: null },
        select: { id: true, seatMapId: true }
    });

    if (!show || !show.seatMapId) {
        const e = new Error("SeatMap Not Found");
        e.status = 404;
        throw e;
    }

    const tpl = await loadSeatMapTemplate(show.seatMapId);
    const allSeats = new Set(expandSeatsFromTemplate(tpl).map(s => s.seatId));

    const soldTickets = await prisma.ticket.findMany({
        where: { showId },
        select: { seatId: true }
    })

    const sold = new Set(soldTickets.map(t => t.seatId));

    // 3) ghế held (để sau)
    // const held = new Set();
    // if (redis) {
    //   const keys = await redis.keys(`hold:${showId}:*`);
    //   for (const k of keys) {
    //     const seatId = k.split(':').pop();
    //     held.add(seatId);
    //   }
    // }


    const availability = [];
    for (const seatId of allSeats) {
        let state = 'available';
        if (sold.has(seatId)) state = 'sold';
        // else if (held.has(seatId)) state = 'held';
        availability.push({ seatId, state });
    }

    return { showId, availability };
}





