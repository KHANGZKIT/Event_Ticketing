// packages/db/prisma/seed_auto.js
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

/** ====== Resolve seatmap directory ====== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tìm project root (thư mục có package.json)
function findProjectRoot(startDir = path.resolve(__dirname, "..", "..")) {
    let dir = startDir;
    while (dir !== path.parse(dir).root) {
        if (fssync.existsSync(path.join(dir, "package.json"))) return dir;
        dir = path.dirname(dir);
    }
    return startDir;
}

const PROJECT_ROOT = findProjectRoot();
const SEATMAP_DIR =
    process.env.SEATMAP_DIR ||
    path.join(PROJECT_ROOT, "packages", "db", "seatmaps");

/** ====== Cities / Venues / Covers / Titles (giữ nguyên) ====== */
const CITIES = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng"];

const VENUES = {
    "Hồ Chí Minh": [
        "Nhà hát Bến Thành",
        "Nhà thi đấu Quận 7",
        "Saigon Music Hall",
        "Nhà Văn hoá Thanh Niên",
    ],
    "Hà Nội": [
        "Nhà hát Lớn Hà Nội",
        "Trung tâm Hội nghị Quốc gia",
        "L’Espace",
        "Long Biên Stage",
    ],
    "Đà Nẵng": [
        "Trung tâm Hội nghị TP. Đà Nẵng",
        "Mỹ Khê Open Air",
        "Cầu Rồng Stage",
        "Nhà hát Trưng Vương",
    ],
};

const COVERS = [
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600",
    "https://images.unsplash.com/photo-1515165562835-c3b8c2e5d43d?w=1600",
    "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=1600",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600",
    "https://images.unsplash.com/photo-1558980664-10ea8d6c1040?w=1600",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600",
];

const TITLES_BY_CITY = {
    "Hồ Chí Minh": [
        "Live Concert Saigon",
        "Stand-up Saigon",
        "EDM Neon Night",
        "Jazz by the River",
        "Acoustic Skyline",
    ],
    "Hà Nội": [
        "Hanoi Symphony Evening",
        "Old Quarter Rap",
        "Acoustic Rooftop",
        "Gala Piano Night",
        "Indie Winter Fest",
    ],
    "Đà Nẵng": [
        "Danang Sunset Sessions",
        "Beach Indie Fest",
        "Han River Comedy",
        "Open Air Concert",
        "Summer Chill Night",
    ],
};

/** ====== Helpers ====== */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function ensureFuture(d) {
    const now = new Date();
    const fut = new Date(now);
    fut.setDate(now.getDate() + rand(7, 30)); // 7–30 ngày tới
    fut.setHours([19, 20][rand(0, 1)], [0, 30][rand(0, 1)], 0, 0);
    return d && d > now ? d : fut;
}

function genSeatLabelsGrid({ rows, cols, startRow }) {
    const out = [];
    const start = (startRow || "A").charCodeAt(0);
    for (let r = 0; r < rows; r++) {
        const row = String.fromCharCode(start + r);
        for (let c = 1; c <= cols; c++) out.push(`${row}${c}`);
    }
    return out;
}

/** ====== Seatmap loader & normalizer ======
 * Hỗ trợ 2 dạng:
 *  A) FILE: { id,name?,priceTiers?, zones:[ {id, rows:[{id,from,to}]} ] }
 *  B) PRESET GRID: { tiers:[{ name, price, rows, cols, startRow }...] }  (giữ tương thích cũ)
 */
async function readSeatmapFiles(dir = SEATMAP_DIR) {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    const list = [];
    for (const f of files) {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        try {
            const data = JSON.parse(raw);
            const id = data.id || path.basename(f, ".json");
            list.push({ id, file: f, data });
        } catch (e) {
            console.warn("[seatmap] Skip invalid JSON:", f, e.message);
        }
    }
    if (!list.length) {
        throw new Error(
            `No seatmap json found in ${dir}. Set SEATMAP_DIR or add files.`
        );
    }
    return list;
}

function expandSeatsFromTemplate(tpl) {
    // dạng A: zones + rows {id,from,to}
    if (Array.isArray(tpl.zones)) {
        const seats = [];
        for (const z of tpl.zones) {
            for (const r of z.rows || []) {
                const from = Number(r.from);
                const to = Number(r.to);
                if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to)
                    continue;
                for (let n = from; n <= to; n++) {
                    seats.push({
                        seatId: `${r.id}${n}`,
                        zone: z.id,
                        tier: z.tier || z.id,
                    });
                }
            }
        }
        return seats;
    }

    // dạng B: preset grid (giữ tương thích)
    if (Array.isArray(tpl.tiers)) {
        return tpl.tiers.flatMap((t) =>
            genSeatLabelsGrid(t).map((seatId) => ({
                seatId,
                zone: t.name,
                tier: t.name,
            }))
        );
    }

    throw new Error("Unsupported seatmap template structure");
}

function deriveTiersFromTemplate(tpl) {
    // Trả về [{name, price?, capacity}]
    if (Array.isArray(tpl.zones)) {
        const priceByTier = tpl.priceTiers || {}; // {"VIP": 150000, ...}
        return tpl.zones.map((z) => {
            // tính capacity theo số ghế expand trong zone z
            let capacity = 0;
            for (const r of z.rows || []) {
                const from = Number(r.from);
                const to = Number(r.to);
                if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to)
                    continue;
                capacity += to - from + 1;
            }
            return {
                name: z.tier || z.id,
                price: priceByTier[z.tier || z.id] ?? null,
                capacity,
            };
        });
    }

    if (Array.isArray(tpl.tiers)) {
        return tpl.tiers.map((t) => ({
            name: t.name,
            price: t.price ?? null,
            capacity: t.rows * t.cols,
        }));
    }

    throw new Error("Unsupported seatmap template structure");
}

/** ====== Create show & tickets from a seatmap tpl ====== */
async function createShowWithTicketsFromTpl(eventId, city, baseStartsAt, seatmap) {
    const seatMapId = seatmap.id;
    const tpl = seatmap.data;

    const show = await prisma.show.create({
        data: {
            eventId,
            startsAt: baseStartsAt,
            venue: pick(VENUES[city]),
            seatMapId,
            status: "scheduled",
        },
        select: { id: true, seatMapId: true },
    });

    const tiers = deriveTiersFromTemplate(tpl);
    // tạo ShowTicketType
    await prisma.$transaction(
        tiers.map((t) =>
            prisma.showTicketType.create({
                data: {
                    showId: show.id,
                    name: t.name,
                    price: t.price ?? 100000, // fallback nếu không có price
                    capacity: t.capacity,
                },
            })
        )
    );

    // tạo Ticket
    const seatObjs = expandSeatsFromTemplate(tpl);
    const allSeats = seatObjs.map((s) => s.seatId);

    // nếu số lượng lớn, chia batch để tránh câu SQL quá dài
    const BATCH = 1000;
    for (let i = 0; i < allSeats.length; i += BATCH) {
        const slice = allSeats.slice(i, i + BATCH);
        await prisma.$transaction(
            slice.map((seatId) => prisma.ticket.create({ data: { showId: show.id, seatId } })),
            { timeout: 60000 }
        );
    }

    // Đánh dấu ~7% ghế “đã bán”
    const sold = allSeats.sort(() => 0.5 - Math.random()).slice(0, Math.floor(allSeats.length * 0.07));
    if (sold.length) {
        const buyer = await prisma.user.upsert({
            where: { email: "demo@seed.local" },
            update: {},
            create: { email: "demo@seed.local", passwordHash: "x", fullName: "Demo Buyer" },
            select: { id: true },
        });

        // tính trung bình giá (nếu có)
        const avgPrice =
            tiers.filter((t) => t.price).reduce((s, t) => s + (t.price || 0), 0) /
            Math.max(1, tiers.filter((t) => t.price).length) || 100000;

        const order = await prisma.order.create({
            data: { userId: buyer.id, showId: show.id, amount: Math.round(sold.length * avgPrice), status: "paid" },
            select: { id: true },
        });

        await prisma.ticket.updateMany({
            where: { showId: show.id, seatId: { in: sold } },
            data: { orderId: order.id },
        });

        await prisma.payment.create({
            data: { orderId: order.id, provider: "seed", amount: Math.round(sold.length * avgPrice), status: "succeeded", paidAt: new Date() },
        });
    }

    return show.id;
}

/** ====== Users (400) + role 'user' ====== */
const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE = ["Anh", "Bảo", "Công", "Đức", "Gia", "Hải", "Hồng", "Huỳnh", "Khánh", "Kim", "Lan", "Minh", "Ngọc", "Phương", "Quang", "Quốc", "Thanh", "Thị", "Thu", "Trung", "Tuấn", "Việt", "Xuân", "Yến"];
const FIRST = ["An", "Anh", "Bình", "Châu", "Chi", "Dũng", "Duy", "Giang", "Hà", "Hải", "Hiếu", "Hùng", "Huy", "Khanh", "Lan", "Linh", "Long", "Mai", "Minh", "My", "Nam", "Ngân", "Ngọc", "Nga", "Nhung", "Phong", "Phúc", "Quân", "Quang", "Quyên", "Sơn", "Tâm", "Thảo", "Thắng", "Thành", "Thiên", "Trang", "Trung", "Tú", "Tùng", "Vy"];
const noAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
const slug = (s) => noAccent(s).toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
const pickName = () => `${pick(LAST)} ${pick(MIDDLE)} ${pick(FIRST)}`;
const randLetters = (n = 2) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

async function seedUsers(count = 400) {
    await prisma.userRole.deleteMany({ where: { user: { email: { not: "admin@gmail.com" } } } });
    await prisma.user.deleteMany({ where: { email: { not: "admin@gmail.com" } } });

    const roleUser = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: { name: "user" },
        select: { id: true },
    });

    const taken = new Set();
    const ops = [];
    for (let i = 0; i < count; i++) {
        const fullName = pickName();
        const parts = noAccent(fullName).split(/\s+/);
        const base1 = slug(`${parts[0]} ${parts.at(-1)}`);
        const base2 = slug(`${parts[0]} ${parts.slice(1).join(" ")}`);
        let base = base1;
        if (taken.has(`${base}@example.dev`)) base = base2;
        let email = `${base}@example.dev`;
        while (taken.has(email)) email = `${base}.${randLetters()}@example.dev`;
        taken.add(email);

        ops.push(
            prisma.user.create({
                data: {
                    email,
                    passwordHash:
                        "$2b$08$.ZSVeFGrw756WfgmZ9KciO6sL7v4f2F4m8rKf3q3wqS8nF9oYJmSq", // bcrypt("Password@123")
                    fullName,
                    roles: { create: [{ role: { connect: { id: roleUser.id } } }] },
                },
            })
        );
    }
    await prisma.$transaction(ops, { timeout: 120000 });
    console.log(`✓ Created ${count} users (role 'user'), password: Password@123`);
}

/** ====== Seed events/shows using REAL seatmaps ====== */
async function seedEventsBundle() {
    const seatmaps = await readSeatmapFiles(SEATMAP_DIR);

    for (const city of CITIES) {
        const titles = TITLES_BY_CITY[city];
        const count = rand(6, 10);

        for (let i = 0; i < count; i++) {
            const name =
                titles[i % titles.length] + (i >= titles.length ? ` #${i + 1}` : "");
            const startsAt = ensureFuture(null);

            const event = await prisma.event.create({
                data: { name, city, cover: pick(COVERS), startsAt },
                select: { id: true, name: true },
            });

            const showCount = rand(2, 3);
            for (let s = 0; s < showCount; s++) {
                const dt = new Date(startsAt);
                dt.setDate(dt.getDate() + s * rand(1, 3));
                const seatmap = pick(seatmaps);
                await createShowWithTicketsFromTpl(event.id, city, dt, seatmap);
            }

            console.log(`✓ ${city} :: ${event.name}`);
        }
    }
}

/** ====== (Optional) seed bảng SeatMap (nếu muốn dùng sau này) ====== */
// Gọi hàm này trong main nếu bạn muốn có bảng SeatMap có cùng id với file
async function seedSeatMapTableIfEmpty() {
    const seatmaps = await readSeatmapFiles(SEATMAP_DIR);
    const count = await prisma.seatMap.count();
    if (count > 0) return;

    await prisma.$transaction(
        seatmaps.map((m) =>
            prisma.seatMap.create({
                data: {
                    id: m.id,
                    name: m.data.name || m.id,
                    schema: m.data,            // ⬅️ BẮT BUỘC: lưu toàn bộ JSON template
                },
            })
        ),
        { timeout: 60000 }
    );
    console.log(`✓ Seeded SeatMap table (${seatmaps.length})`);
}


/** ====== Entry ====== */
async function main() {
    console.log("[seatmap] dir =", SEATMAP_DIR);
    console.time("seed");
    await seedUsers(400);
    await seedSeatMapTableIfEmpty();
    await seedEventsBundle();
    console.timeEnd("seed");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
