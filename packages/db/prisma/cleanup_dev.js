// packages/db/prisma/cleanup_dev.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    await prisma.$transaction([
        prisma.payment.deleteMany({}),
        prisma.ticket.deleteMany({}),
        prisma.order.deleteMany({}),
        prisma.showTicketType.deleteMany({}),
        prisma.show.deleteMany({}),
        prisma.event.deleteMany({}),
        prisma.idempotencyKey.deleteMany({}),
        // giữ admin nếu có
        prisma.userRole.deleteMany({ where: { user: { email: { not: "admin@gmail.com" } } } }),
        prisma.user.deleteMany({ where: { email: { not: "admin@gmail.com" } } }),
    ]);
    console.log("✓ Cleaned dev data (kept admin).");
}

main().catch(e => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
