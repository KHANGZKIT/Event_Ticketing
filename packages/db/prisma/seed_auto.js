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

// Hình ảnh từ các website: Unsplash, Pexels, và các nguồn khác
const COVERS = [
    // Unsplash - Concert & Music Events
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600",
    "https://images.unsplash.com/photo-1515165562835-c3b8c2e5d43d?w=1600",
    "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=1600",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600",
    "https://images.unsplash.com/photo-1558980664-10ea8d6c1040?w=1600",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600",
    "https://images.unsplash.com/photo-1464362350603-30e6de19a68e?w=1600",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c5b4?w=1600",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600",
    "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=1600",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1600",
    "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1600",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&auto=format&fit=crop",
    
    // Pexels - Concert & Events
    "https://images.pexels.com/photos/167491/pexels-photo-167491.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763076/pexels-photo-1763076.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/154147/pexels-photo-154147.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/270366/pexels-photo-270366.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/167446/pexels-photo-167446.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763077/pexels-photo-1763077.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763078/pexels-photo-1763078.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Theater & Stage
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1600",
    "https://images.unsplash.com/photo-1464362350603-30e6de19a68e?w=1600",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600",
    
    // Pexels - Stage & Theater
    "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/2747450/pexels-photo-2747450.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/2747451/pexels-photo-2747451.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Festival & Outdoor Events
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600",
    "https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1600",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1600",
    "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=1600",
    
    // Pexels - Festival Events
    "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Jazz & Acoustic
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1600",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c5b4?w=1600",
    
    // Pexels - Jazz & Music
    "https://images.pexels.com/photos/1763079/pexels-photo-1763079.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763080/pexels-photo-1763080.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - EDM & Electronic Music
    "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=1600",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1600&q=80",
    
    // Pexels - Electronic Music
    "https://images.pexels.com/photos/1190299/pexels-photo-1190299.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1190300/pexels-photo-1190300.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1190301/pexels-photo-1190301.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Stand-up Comedy
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c5b4?w=1600&q=80",
    
    // Pexels - Comedy Events
    "https://images.pexels.com/photos/1763073/pexels-photo-1763073.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763074/pexels-photo-1763074.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Sports Events
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600",
    
    // Pexels - Sports Events  
    "https://images.pexels.com/photos/2747447/pexels-photo-2747447.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/2747448/pexels-photo-2747448.jpeg?auto=compress&cs=tinysrgb&w=1600",
    
    // Unsplash - Dance & Performance
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80",
    
    // Pexels - Dance Events
    "https://images.pexels.com/photos/1763071/pexels-photo-1763071.jpeg?auto=compress&cs=tinysrgb&w=1600",
    "https://images.pexels.com/photos/1763072/pexels-photo-1763072.jpeg?auto=compress&cs=tinysrgb&w=1600",
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

    // dạng C: rows với name và count (SM_DEMO_1.json)
    if (Array.isArray(tpl.rows)) {
        const seats = [];
        for (const row of tpl.rows) {
            const rowName = row.name || row.id;
            const count = Number(row.count);
            if (!rowName || Number.isNaN(count) || count <= 0) continue;
            for (let n = 1; n <= count; n++) {
                seats.push({
                    seatId: `${rowName}${n}`,
                    zone: "Default",
                    tier: "Default",
                });
            }
        }
        return seats;
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

    // dạng C: rows với name và count (SM_DEMO_1.json)
    if (Array.isArray(tpl.rows)) {
        let totalCapacity = 0;
        for (const row of tpl.rows) {
            const count = Number(row.count);
            if (!Number.isNaN(count) && count > 0) {
                totalCapacity += count;
            }
        }
        const priceByTier = tpl.priceTiers || {};
        const defaultPrice = priceByTier["Default"] || priceByTier["STANDARD"] || 100000;
        
        return [{
            name: "Default",
            price: defaultPrice,
            capacity: totalCapacity || 20, // fallback nếu không tính được
        }];
    }

    throw new Error("Unsupported seatmap template structure");
}

/** ====== Create show & tickets from a seatmap tpl ====== */
async function createShowWithTicketsFromTpl(eventId, city, baseStartsAt, seatmap) {
    const seatMapId = seatmap.id;
    const tpl = seatmap.data;

    // Validate seatmap template trước khi sử dụng
    try {
        expandSeatsFromTemplate(tpl); // Test xem có parse được không
    } catch (e) {
        console.warn(`⚠️  Skip invalid seatmap ${seatMapId}: ${e.message}`);
        return null; // Bỏ qua seatmap không hợp lệ
    }

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

    // Tăng số lượng events để đủ cho tất cả sections (7 sections * 4 events = 28+ events)
    const TOTAL_EVENTS = 30; // Đảm bảo có đủ events

    // Phân bố events cho các thành phố
    const eventsPerCity = Math.ceil(TOTAL_EVENTS / CITIES.length);

    for (const city of CITIES) {
        const titles = TITLES_BY_CITY[city];
        
        for (let i = 0; i < eventsPerCity; i++) {
            const titleIndex = i % titles.length;
            const name = i >= titles.length 
                ? `${titles[titleIndex]} #${Math.floor(i / titles.length) + 1}`
                : titles[titleIndex];
            const startsAt = ensureFuture(null);

            const event = await prisma.event.create({
                data: { name, city, cover: pick(COVERS), startsAt },
                select: { id: true, name: true },
            });

            // Mỗi event có 2-3 shows
            const showCount = rand(2, 3);
            for (let s = 0; s < showCount; s++) {
                const dt = new Date(startsAt);
                dt.setDate(dt.getDate() + s * rand(1, 3));
                let seatmap = pick(seatmaps);
                let result = await createShowWithTicketsFromTpl(event.id, city, dt, seatmap);
                
                // Nếu seatmap không hợp lệ, thử lại với seatmap khác (tối đa 3 lần)
                if (!result) {
                    let retries = 0;
                    while (!result && retries < 3) {
                        seatmap = pick(seatmaps);
                        result = await createShowWithTicketsFromTpl(event.id, city, dt, seatmap);
                        if (result) break;
                        retries++;
                    }
                    if (!result) {
                        console.warn(`⚠️  Could not create show for ${event.name} - skipping`);
                    }
                }
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


/** ====== Update existing events without cover ====== */
async function updateEventsWithoutCover() {
    const eventsWithoutCover = await prisma.event.findMany({
        where: {
            OR: [
                { cover: null },
                { cover: "" },
            ],
            deletedAt: null,
        },
        select: { id: true, name: true },
    });

    if (eventsWithoutCover.length === 0) {
        console.log("✓ All events have cover images");
        return;
    }

    console.log(`📸 Updating ${eventsWithoutCover.length} events without cover...`);
    
    for (const event of eventsWithoutCover) {
        await prisma.event.update({
            where: { id: event.id },
            data: { cover: pick(COVERS) },
        });
    }
    
    console.log(`✓ Updated ${eventsWithoutCover.length} events with cover images`);
}

/** ====== Entry ====== */
async function main() {
    console.log("[seatmap] dir =", SEATMAP_DIR);
    console.time("seed");
    
    // Xóa events cũ (optional - chỉ khi muốn reset)
    const deleteOld = process.env.RESET_EVENTS === 'true';
    if (deleteOld) {
        await prisma.show.deleteMany({});
        await prisma.event.deleteMany({});
        console.log("✓ Deleted old events & shows");
    }
    
    await seedUsers(400);
    await seedSeatMapTableIfEmpty();
    
    // Update events hiện có không có cover
    await updateEventsWithoutCover();
    
    await seedEventsBundle();
    console.timeEnd("seed");
    console.log(`\n✓ Seeding completed! You can now view events on the homepage.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
