// scripts/reset_and_seed.js
// Xóa users (trừ admin) và tất cả orders, tickets, payments rồi seed lại
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Đang xóa dữ liệu cũ...');

    // Xóa theo thứ tự đúng foreign key constraints
    await prisma.payment.deleteMany({});
    console.log('   ✓ Đã xóa payments');

    await prisma.ticket.deleteMany({});
    console.log('   ✓ Đã xóa tickets');

    await prisma.order.deleteMany({});
    console.log('   ✓ Đã xóa orders');

    await prisma.userRole.deleteMany({ where: { user: { email: { not: 'admin@gmail.com' } } } });
    await prisma.user.deleteMany({ where: { email: { not: 'admin@gmail.com' } } });
    console.log('   ✓ Đã xóa users (giữ admin)');

    console.log('\n✅ Hoàn tất xóa dữ liệu! Chạy seed_users.js tiếp theo.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
