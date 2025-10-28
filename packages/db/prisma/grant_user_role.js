// packages/db/prisma/grant_user_role.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // đảm bảo role 'user' tồn tại
    const userRole = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: { name: "user" },
        select: { id: true },
    });

    // lấy danh sách user chưa có role 'user'
    const users = await prisma.user.findMany({
        where: {
            roles: { none: { role: { name: "user" } } }, // chưa có role user
            email: { not: "admin@gmail.com" },           // giữ admin nếu bạn gán role khác
        },
        select: { id: true },
    });

    if (!users.length) {
        console.log("✓ Tất cả user đã có role 'user'.");
        return;
    }

    // tạo bản ghi UserRole hàng loạt
    await prisma.$transaction(
        users.map((u) =>
            prisma.userRole.create({
                data: { userId: u.id, roleId: userRole.id },
            })
        ),
        { timeout: 60000 }
    );

    console.log(`✓ Gán role 'user' cho ${users.length} tài khoản.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());

