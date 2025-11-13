import { prisma } from "@app/db";
import fs from "node:fs/promises";
import fssync from "node:fs"; // thêm dòng này
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getHeldSeatByShow } from "../holds/holds.redis.service.js";

/* --------- utils --------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

// tìm project root (có package.json) để không bị lệch khi build dist/
function findProjectRoot(startDir = __dirname) {
    let dir = startDir;
    while (dir !== path.parse(dir).root) {
        if (fssync.existsSync(path.join(dir, "package.json"))) return dir;
        dir = path.dirname(dir);
    }
    return startDir;
}
const PROJECT_ROOT = findProjectRoot();
const SEATMAP_DIR = process.env.SEATMAP_DIR
    || path.join(PROJECT_ROOT, "packages", "db", "seatmaps");

function validateSeatmap(tpl) {
    if (!tpl || !Array.isArray(tpl.zones)) {
        const e = new Error("Invalid seatmap template: zones missing");
        e.status = 500; throw e;
    }
    tpl.zones.forEach((z, i) => {
        if (!Array.isArray(z.rows)) {
            const e = new Error(`Invalid seatmap template: zones[${i}].rows missing`);
            e.status = 500; throw e;
        }
    });
}

/* --------- Shows --------- */

export async function getShow(id) {
    const s = await prisma.show.findFirst({
        where: { id, deletedAt: null },
    });
    if (!s) {
        const e = new Error("Show not found");
        e.status = 404;
        throw e;
    }
    return s;
}

export async function createShow(data) {
    // đảm bảo event còn hoạt động
    const ev = await prisma.event.findFirst({
        where: { id: data.eventId, deletedAt: null },
        select: { id: true },
    });
    if (!ev) {
        const e = new Error("Event Not Found");
        e.status = 404;
        throw e;
    }

    return prisma.show.create({
        data: {
            eventId: data.eventId,
            startsAt: safeDate(data.startsAt) ?? new Date(),
            venue: data.venue ?? null,
            seatMapId: data.seatMapId ?? null,
            // optional nâng cấp dần:
            venueDbId: data.venueDbId ?? null,
            seatMapDbId: data.seatMapDbId ?? null,
            status: data.status ?? "scheduled",
        },
    });
}

export async function updateShow(id, data) {
    const s = await prisma.show.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!s) {
        const e = new Error("Show not found");
        e.status = 404;
        throw e;
    }

    return prisma.show.update({
        where: { id },
        data: {
            ...(data.eventId !== undefined ? { eventId: data.eventId } : {}),
            ...(data.startsAt !== undefined
                ? { startsAt: safeDate(data.startsAt) }
                : {}),
            ...(data.venue !== undefined ? { venue: data.venue } : {}),
            ...(data.seatMapId !== undefined ? { seatMapId: data.seatMapId } : {}),
            ...(data.venueDbId !== undefined ? { venueDbId: data.venueDbId } : {}),
            ...(data.seatMapDbId !== undefined
                ? { seatMapDbId: data.seatMapDbId }
                : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
        },
        // có thể select tuỳ ý ở đây nếu muốn rút gọn response
    });
}

export async function deleteShow(id) {
    const s = await prisma.show.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
    });
    if (!s) {
        const e = new Error("Show not found");
        e.status = 404;
        throw e;
    }
    await prisma.show.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
}

/* --------- Seatmap (template file) --------- */

export async function loadSeatMapTemplate(seatMapId) {
    // 0) ƯU TIÊN: đọc từ DB (bảng SeatMap.schema)
    // Thử tìm theo UUID trước (seatMapDbId)
    try {
        const row = await prisma.seatMap.findUnique({
            where: { id: seatMapId },
            select: { schema: true },
        });
        if (row?.schema) {
            validateSeatmap(row.schema);
            return row.schema;
        }
    } catch (e) {
        // nếu lỗi DB, bỏ qua để fallback
    }

    // Nếu không tìm thấy trong DB theo UUID, thử tìm theo name (cho seatMapId cũ như "map_theater_balcony")
    // Chỉ thử nếu seatMapId không phải UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seatMapId);
    if (!isUUID) {
        try {
            // Tìm SeatMap có name chứa seatMapId hoặc id trùng
            const row = await prisma.seatMap.findFirst({
                where: {
                    OR: [
                        { id: seatMapId },
                        { name: { contains: seatMapId, mode: 'insensitive' } },
                    ],
                },
                select: { schema: true },
            });
            if (row?.schema) {
                validateSeatmap(row.schema);
                return row.schema;
            }
        } catch (e) {
            // bỏ qua, tiếp tục fallback file
        }
    }

    // 1) File lẻ <id>.json
    const filePath = path.join(SEATMAP_DIR, `${seatMapId}.json`);
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const tpl = JSON.parse(content);
        validateSeatmap(tpl);
        return tpl;
    } catch (err) {
        if (err?.code !== "ENOENT") throw err;
    }

    // 2) Fallback: tìm trong seatmaps_pack.json
    try {
        const packPath = path.join(SEATMAP_DIR, "seatmaps_pack.json");
        const raw = await fs.readFile(packPath, "utf-8");
        const arr = JSON.parse(raw);
        const tpl = Array.isArray(arr) ? arr.find((m) => m?.id === seatMapId) : null;
        if (tpl) {
            validateSeatmap(tpl);
            return tpl;
        }
    } catch (_) { /* không có pack cũng OK */ }

    const e = new Error(`Seatmap template not found: ${seatMapId}`);
    e.status = 404;
    throw e;
}

export function expandSeatsFromTemplate(tpl) {
    const seats = [];
    for (const z of tpl.zones) {
        const tier = z.id;
        for (const r of z.rows) {
            const from = Number(r.from);
            const to = Number(r.to);
            if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to) continue;
            for (let n = from; n <= to; n++) {
                seats.push({ seatId: `${r.id}${n}`, zone: z.id, tier });
            }
        }
    }
    return seats;
}

// shows.service.js (hoặc nơi bạn định nghĩa getSeatMap)

export async function getSeatMap(showId) {
    const show = await prisma.show.findFirst({
        where: { id: showId, deletedAt: null },
        select: { id: true, seatMapId: true, seatMapDbId: true },
    });

    if (!show) {
        const e = new Error("Show Not Found");
        e.status = 404; throw e;
    }

    // Ưu tiên seatMapDbId (UUID từ bảng SeatMap), fallback về seatMapId (string cũ)
    let seatMapIdEff = show.seatMapDbId ?? show.seatMapId;
    
    // Nếu có seatMapId nhưng chưa có seatMapDbId, thử tìm trong DB
    if (!show.seatMapDbId && show.seatMapId) {
        try {
            // Tìm SeatMap trong DB theo id hoặc name
            const seatMap = await prisma.seatMap.findFirst({
                where: {
                    OR: [
                        { id: show.seatMapId },
                        { name: { contains: show.seatMapId, mode: 'insensitive' } },
                    ],
                },
                select: { id: true },
            });
            
            if (seatMap) {
                // Tự động migrate: update show với seatMapDbId
                await prisma.show.update({
                    where: { id: show.id },
                    data: { seatMapDbId: seatMap.id },
                });
                seatMapIdEff = seatMap.id;
                console.log(`[getSeatMap] Auto-migrated show ${showId}: ${show.seatMapId} → ${seatMap.id}`);
            }
        } catch (e) {
            // Nếu không tìm thấy trong DB, dùng seatMapId cũ (load từ file)
            console.warn(`[getSeatMap] Show ${showId} has seatMapId="${show.seatMapId}" but not found in DB, using file fallback`);
        }
    }
    
    if (!seatMapIdEff) {
        const e = new Error(`SeatMap Not Found for show ${showId}. Please assign a seatmap to this show.`);
        e.status = 404; throw e;
    }

    // đọc DB > file rời <id>.json > seatmaps_pack.json
    const tpl = await loadSeatMapTemplate(seatMapIdEff);

    // Lấy danh sách ghế đã bán (có orderId)
    const soldTickets = await prisma.ticket.findMany({
        where: { 
            showId: show.id,
            orderId: { not: null } // Chỉ tính ghế đã bán (có order)
        },
        select: { seatId: true },
    });
    const booked = soldTickets.map(t => t.seatId);

    // Lấy danh sách ghế đang được hold (từ Redis)
    const heldSet = await getHeldSeatByShow(show.id).catch(() => new Set());
    const held = Array.from(heldSet);

    return {
        showId: show.id,
        template: { ...tpl, seats: expandSeatsFromTemplate(tpl) },
        held,      // Danh sách ghế đang được hold
        booked     // Danh sách ghế đã được bán
    };
}


export async function getAvailability(showId) {
    console.log('[avail] in:', { showId });
    const show = await prisma.show.findFirst({
        where: { id: showId, deletedAt: null },
        select: { id: true, seatMapId: true, seatMapDbId: true },
    });
    console.log('[avail] db:', show);
    if (!show) { const e = new Error('Show Not Found'); e.status = 404; throw e; }
    const seatMapIdEff = show.seatMapDbId ?? show.seatMapId;
    if (!seatMapIdEff) { const e = new Error('SeatMap Not Found'); e.status = 404; throw e; }

    const tpl = await loadSeatMapTemplate(seatMapIdEff);

    // expandSeatsFromTemplate giờ là hàm sync
    const allSeatsArr = expandSeatsFromTemplate(tpl).map(s => s.seatId);
    const allSeats = new Set(allSeatsArr);

    const soldTickets = await prisma.ticket.findMany({
        where: { showId, orderId: { not: null } },
        select: { seatId: true },
    });
    const sold = new Set(soldTickets.map(t => t.seatId));

    // đảm bảo getHeldSeatByShow trả Set<string>
    const held = await getHeldSeatByShow(showId); // Set<seatId>

    const availability = [];
    for (const seatId of allSeatsArr) {
        let state = 'available';
        if (sold.has(seatId)) state = 'sold';
        else if (held.has(seatId)) state = 'held';
        availability.push({ seatId, state });
    }

    return { showId, availability };
}
