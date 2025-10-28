// packages/db/prisma/seed_users.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

/* Tên tiếng Việt phổ biến */
const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE = ["Anh", "Bảo", "Công", "Đức", "Gia", "Hải", "Hồng", "Huỳnh", "Khánh", "Kim", "Lan", "Minh", "Ngọc", "Phương", "Quang", "Quốc", "Thanh", "Thị", "Thu", "Trung", "Tuấn", "Việt", "Xuân", "Yến"];
const FIRST = ["An", "Anh", "Bình", "Châu", "Chi", "Dũng", "Duy", "Giang", "Hà", "Hải", "Hiếu", "Hùng", "Huy", "Khanh", "Lan", "Linh", "Long", "Mai", "Minh", "My", "Nam", "Ngân", "Ngọc", "Nga", "Nhung", "Phong", "Phúc", "Quân", "Quang", "Quyên", "Sơn", "Tâm", "Thảo", "Thắng", "Thành", "Thiên", "Trang", "Trung", "Tú", "Tùng", "Vy"];

/* Helpers */
const removeDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d");
const slug = (s) => removeDiacritics(s).toLowerCase().replace(/[^a-z\s]/g, "").trim().replace(/\s+/g, ".");
const pick = (a) => a[Math.floor(Math.random() * a.length)];
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

async function main() {
    const COUNT = 400;
    const DEFAULT_PW = "Password@123";
    const pwHash = await bcrypt.hash(DEFAULT_PW, 8);

    // Giữ admin, xoá user cũ khác nếu muốn làm sạch
    await prisma.userRole.deleteMany({ where: { user: { email: { not: "admin@gmail.com" } } } });
    await prisma.user.deleteMany({ where: { email: { not: "admin@gmail.com" } } });

    // Đảm bảo role 'user' tồn tại
    const roleUser = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: { name: "user" },
        select: { id: true },
    });

    const taken = new Set();
    const ops = [];
    for (let i = 0; i < COUNT; i++) {
        const fullName = makeFullName();
        const email = makeEmailFromName(fullName, taken);

        // Tạo user + gán role qua bảng nối UserRole (nested create)
        ops.push(
            prisma.user.create({
                data: {
                    email,
                    passwordHash: pwHash,
                    fullName,
                    roles: {
                        create: [{ role: { connect: { id: roleUser.id } } }],
                    },
                },
            })
        );
    }

    await prisma.$transaction(ops, { timeout: 60000 });
    console.log(`✓ Created ${COUNT} users, all with role 'user'. Default password: ${DEFAULT_PW}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
