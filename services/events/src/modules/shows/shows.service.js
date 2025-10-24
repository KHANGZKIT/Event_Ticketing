import { prisma } from "@app/db";
import fs from "node:fs/promises";
import fssync from "node:fs"; // thêm dòng này
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getHeldSeatByShow } from "../holds/holds.service.js";

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
        // nếu lỗi DB, bỏ qua để fallback file
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


export async function expandSeatsFromTemplate(tpl) {
    const seats = [];
    for (const z of tpl.zones) {
        const tier = z.id; // tier = zone id
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
        seats: expandSeatsFromTemplate(tpl), // nếu FE chỉ cần tiers, có thể bỏ trường này
    };
}

/* --------- Availability (sold/held) --------- */

export async function getAvailability(showId, redis) {
    // Check show
    const show = await prisma.show.findFirst({
        where: { id: showId, deletedAt: null },
        select: { id: true, seatMapId: true },
    });
    if (!show || !show.seatMapId) {
        const e = new Error("SeatMap Not Found");
        e.status = 404;
        throw e;
    }

    // All seats from template
    const tpl = await loadSeatMapTemplate(show.seatMapId);
    const allSeats = new Set(expandSeatsFromTemplate(tpl).map((s) => s.seatId));

    // SOLD = ticket có orderId != null
    const soldTickets = await prisma.ticket.findMany({
        where: { showId, orderId: { not: null } },
        select: { seatId: true },
    });
    const sold = new Set(soldTickets.map((t) => t.seatId));

    // HELD = đang giữ chỗ trong Redis (tuỳ triển khai)
    const heldFromCache = await getHeldSeatByShow(showId, redis); // <- nhớ await + truyền redis
    const held = new Set(
        Array.isArray(heldFromCache) ? heldFromCache : [...(heldFromCache || [])]
    );

    const availability = [];
    for (const seatId of allSeats) {
        let state = "available";
        if (sold.has(seatId)) state = "sold";
        else if (held.has(seatId)) state = "held";
        availability.push({ seatId, state });
    }

    return { showId, availability };
}
