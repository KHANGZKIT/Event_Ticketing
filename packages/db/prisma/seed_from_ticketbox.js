// packages/db/prisma/seed_from_ticketbox.js
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// seatmap presets khớp FE
const SEATMAPS = {
    "theater-3tier-v1": [
        { name: "VIP", price: 150000, rows: 3, cols: 12, startRow: "E" },
        { name: "Thường", price: 100000, rows: 8, cols: 14, startRow: "H" },
    ],
    "arena-2tier-v1": [
        { name: "VIP", price: 190000, rows: 4, cols: 15, startRow: "A" },
        { name: "Thường", price: 120000, rows: 10, cols: 18, startRow: "E" },
    ],
};
const SEATMAP_IDS = Object.keys(SEATMAPS);

const VENUE_BY_CITY = {
    "Hồ Chí Minh": ["Nhà hát Bến Thành", "Nhà thi đấu Quận 7", "Saigon Music Hall"],
    "Hà Nội": ["Nhà hát Lớn Hà Nội", "L’Espace", "Long Biên Stage"],
    "Đà Nẵng": ["Trung tâm Hội nghị TP. Đà Nẵng", "Mỹ Khê Open Air", "Cầu Rồng Stage"],
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function ensureFuture(d) {
    // nếu startsAt null hoặc < now → đẩy 7–30 ngày tới
    const now = new Date();
    if (!d || d < now) {
        const fut = new Date();
        fut.setDate(now.getDate() + rand(7, 30));
        fut.setHours([19, 20][rand(0, 1)], [0, 30][rand(0, 1)], 0, 0);
        return fut;
    }
    return d;
}

function genSeats(tier) {
    const out = [];
    const start = (tier.startRow || "A").charCodeAt(0);
    for (let r = 0; r < tier.rows; r++) {
        const row = String.fromCharCode(start + r);
        for (let c = 1; c <= tier.cols; c++) out.push(`${row}${c}`);
    }
    return out;
}

async function seedFromDetails(details) {
    // user demo để “đã bán” một ít ghế
    const demoBuyer = await prisma.user.upsert({
        where: { email: "demo@seed.local" },
        update: {},
        create: { email: "demo@seed.local", passwordHash: "x", fullName: "Demo Buyer" }
    });

    for (const ev of details) {
        const city = ev.city || pick(["Hồ Chí Minh", "Hà Nội", "Đà Nẵng"]);
        const startsAt = ensureFuture(ev.startsAt ? new Date(ev.startsAt) : null);

        const event = await prisma.event.create({
            data: {
                name: ev.title || "Untitled Event",
                city,
                cover: ev.cover || null,
                startsAt,
                // venueId: optional (đang không dùng)
            },
            select: { id: true, name: true }
        });

        // 2–3 shows quanh startsAt
        const showCount = rand(2, 3);
        for (let i = 0; i < showCount; i++) {
            const date = new Date(startsAt);
            date.setDate(date.getDate() + i * rand(1, 3));

            const seatMapId = pick(SEATMAP_IDS);
            const show = await prisma.show.create({
                data: {
                    eventId: event.id,
                    startsAt: date,
                    venue: pick(VENUE_BY_CITY[city]),
                    seatMapId,
                    status: "scheduled",
                },
                select: { id: true, seatMapId: true }
            });

            // sinh ticket theo seatmap
            const tiers = SEATMAPS[seatMapId];
            const allSeats = tiers.flatMap(genSeats);
            // tạo tickets hàng loạt
            await prisma.$transaction(
                allSeats.map(seatId => prisma.ticket.create({ data: { showId: show.id, seatId } })),
                { timeout: 60000 }
            );

            // giả “đã bán” 5–10% ghế
            const sold = allSeats.sort(() => 0.5 - Math.random()).slice(0, Math.floor(allSeats.length * 0.07));
            const order = await prisma.order.create({
                data: { userId: demoBuyer.id, showId: show.id, amount: sold.length * 100000, status: "paid" }
            });
            await prisma.ticket.updateMany({ where: { showId: show.id, seatId: { in: sold } }, data: { orderId: order.id } });
        }

        console.log("✓ Seeded", event.name);
    }
}

async function main() {
    const details = JSON.parse(await fs.readFile("scripts/event_details.json", "utf8"));
    await seedFromDetails(details);
}
main()
    .then(() => console.log("Done seed from Ticketbox details"))
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
