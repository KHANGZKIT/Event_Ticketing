// packages/db/prisma/seed_users.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

/* Tên tiếng Việt phổ biến */
const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE = ["Anh", "Bảo", "Công", "Đức", "Gia", "Hải", "Hồng", "Huỳnh", "Khánh", "Kim", "Lan", "Minh", "Ngọc", "Phương", "Quang", "Quốc", "Thanh", "Thị", "Thu", "Trung", "Tuấn", "Việt", "Xuân", "Yến"];
const FIRST = ["An", "Anh", "Bình", "Châu", "Chi", "Dũng", "Duy", "Giang", "Hà", "Hải", "Hiếu", "Hùng", "Huy", "Khanh", "Lan", "Linh", "Long", "Mai", "Minh", "My", "Nam", "Ngân", "Ngọc", "Nga", "Nhung", "Phong", "Phúc", "Quân", "Quang", "Quyên", "Sơn", "Tâm", "Thảo", "Thắng", "Thành", "Thiên", "Trang", "Trung", "Tú", "Tùng", "Vy"];

/* Helpers */
const removeDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
const slug = (s) => removeDiacritics(s).toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randLetters = (n = 2) => Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

function makeFullName() { return `${pick(LAST)} ${pick(MIDDLE)} ${pick(FIRST)}`; }

function makeEmailFromName(fullName, taken) {
    const parts = removeDiacritics(fullName).split(/\s+/);
    const last = parts[0], first = parts[parts.length - 1];
    const middle = parts.slice(1, -1).join(" ");
    let base = slug(`${last} ${first}`);
    if (taken.has(`${base}@example.dev`)) base = slug(`${last} ${middle} ${first}`);
    let email = `${base}@example.dev`;
    while (taken.has(email)) email = `${base}.${randLetters()}@example.dev`;
    taken.add(email);
    return email;
}

// Generate a random seat ID like "A1", "B5", "C12"
function generateSeatId(usedSeats) {
    const rows = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let seatId;
    let attempts = 0;
    do {
        const row = rows[Math.floor(Math.random() * 10)]; // A-J
        const num = randInt(1, 20);
        seatId = `${row}${num}`;
        attempts++;
    } while (usedSeats.has(seatId) && attempts < 100);
    usedSeats.add(seatId);
    return seatId;
}

async function main() {
    const USER_COUNT = randInt(100, 150); // 100-150 users
    const DEFAULT_PW = "Password@123";
    const pwHash = await bcrypt.hash(DEFAULT_PW, 8);

    console.log(`🚀 Starting seed: ${USER_COUNT} users with orders...`);

    // Đảm bảo role 'user' tồn tại
    const roleUser = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: { name: "user" },
        select: { id: true },
    });

    // Lấy danh sách shows có sẵn
    const shows = await prisma.show.findMany({
        where: { deletedAt: null },
        select: { id: true, eventId: true },
        take: 50
    });

    if (shows.length === 0) {
        console.warn("⚠️ No shows found. Please seed events/shows first. Skipping order creation.");
    }

    const taken = new Set();
    const usedSeatsPerShow = new Map(); // showId -> Set of used seatIds

    let totalOrders = 0;
    let totalTickets = 0;

    for (let i = 0; i < USER_COUNT; i++) {
        const fullName = makeFullName();
        const email = makeEmailFromName(fullName, taken);

        // Tạo user + gán role (skip nếu email đã tồn tại)
        let user;
        try {
            user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: pwHash,
                    fullName,
                    roles: {
                        create: [{ role: { connect: { id: roleUser.id } } }],
                    },
                },
            });
        } catch (err) {
            if (err.code === 'P2002') {
                // Email already exists, skip
                continue;
            }
            throw err;
        }

        // Nếu có shows, tạo 1-2 orders cho user
        if (shows.length > 0) {
            const numOrders = randInt(1, 2); // 1-2 orders per user

            for (let o = 0; o < numOrders; o++) {
                const show = pick(shows);
                const numSeats = randInt(1, 2); // 1-2 seats per order
                const pricePerSeat = randInt(100000, 500000); // 100k - 500k VND

                // Get or create used seats set for this show
                if (!usedSeatsPerShow.has(show.id)) {
                    usedSeatsPerShow.set(show.id, new Set());
                }
                const usedSeats = usedSeatsPerShow.get(show.id);

                // Generate unique seat IDs for this order
                const seatIds = [];
                for (let s = 0; s < numSeats; s++) {
                    seatIds.push(generateSeatId(usedSeats));
                }

                const totalAmount = pricePerSeat * numSeats;

                // Random date trong 30 ngày gần đây
                const daysAgo = randInt(1, 30);
                const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

                try {
                    // Tạo Order với status 'paid' và createdAt spread
                    const order = await prisma.order.create({
                        data: {
                            userId: user.id,
                            showId: show.id,
                            amount: totalAmount,
                            status: "paid",
                            currency: "VND",
                            createdAt: orderDate,
                            updatedAt: orderDate,
                        }
                    });

                    // Tạo Tickets cho order với cùng ngày
                    for (const seatId of seatIds) {
                        await prisma.ticket.create({
                            data: {
                                showId: show.id,
                                seatId: seatId,
                                orderId: order.id,
                                code: randomUUID().slice(0, 8).toUpperCase(),
                                createdAt: orderDate,
                                updatedAt: orderDate,
                            }
                        });
                        totalTickets++;
                    }

                    // Tạo Payment cho order
                    await prisma.payment.create({
                        data: {
                            orderId: order.id,
                            provider: pick(["vnpay", "momo", "zalopay"]),
                            amount: totalAmount,
                            currency: "VND",
                            status: "succeeded",
                            paidAt: orderDate,
                            createdAt: orderDate,
                            updatedAt: orderDate,
                        }
                    });

                    totalOrders++;
                } catch (err) {
                    // Skip if duplicate seat (unique constraint)
                    if (err.code !== 'P2002') {
                        console.warn(`⚠️ Error creating order for user ${email}:`, err.message);
                    }
                }
            }
        }

        if ((i + 1) % 20 === 0) {
            console.log(`   ✓ Created ${i + 1}/${USER_COUNT} users...`);
        }
    }

    console.log(`\n✅ Seed completed!`);
    console.log(`   - Users: ${USER_COUNT}`);
    console.log(`   - Orders: ${totalOrders}`);
    console.log(`   - Tickets: ${totalTickets}`);
    console.log(`   - Default password: ${DEFAULT_PW}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
