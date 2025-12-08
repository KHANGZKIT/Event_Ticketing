/**
 * Seed Complete Chart Data - Tạo Orders, Payments VÀ Tickets cho Dashboard
 * Giữ nguyên Events và Shows hiện có
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Generate unique seat code
function generateSeatId(row, col) {
    const rowLetter = String.fromCharCode(65 + row); // A, B, C...
    return `${rowLetter}${col + 1}`;
}

// Generate unique ticket code
function generateTicketCode() {
    return `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function seedCompleteData() {
    console.log('🎯 Đang tạo dữ liệu HOÀN CHỈNH cho Dashboard...\n');

    // Xóa dữ liệu cũ để tránh duplicate
    console.log('🗑️ Xóa dữ liệu cũ...');
    await prisma.ticket.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    console.log('✅ Đã xóa dữ liệu cũ\n');

    // Lấy danh sách shows có ticket types
    const shows = await prisma.show.findMany({
        include: {
            ticketTypes: true,
            event: true
        },
        take: 20
    });

    if (shows.length === 0) {
        console.log('❌ Không tìm thấy shows. Vui lòng chạy seed events trước.');
        return;
    }

    console.log(`📍 Tìm thấy ${shows.length} shows\n`);

    // Lấy hoặc tạo user
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: 'demo@ticketbook.vn',
                password: 'hashed_password',
                name: 'Demo User',
                role: 'user'
            }
        });
    }

    const orderStatuses = ['pending', 'paid', 'paid', 'paid', 'paid', 'paid', 'cancelled'];
    const paymentStatuses = ['succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded', 'failed'];
    const paymentMethods = ['momo', 'vnpay', 'banking', 'credit_card'];

    let ordersCreated = 0;
    let paymentsCreated = 0;
    let ticketsCreated = 0;
    let seatCounter = 0;

    // Tạo 80 orders trong 30 ngày qua
    for (let i = 0; i < 80; i++) {
        const show = shows[Math.floor(Math.random() * shows.length)];
        const ticketTypes = show.ticketTypes;

        if (ticketTypes.length === 0) {
            continue;
        }

        const ticketType = ticketTypes[Math.floor(Math.random() * ticketTypes.length)];
        const quantity = Math.floor(Math.random() * 4) + 1; // 1-4 tickets per order
        const amount = Number(ticketType.price) * quantity;
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

        // Random date trong 30 ngày qua
        const daysAgo = Math.floor(Math.random() * 30);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);
        orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        try {
            // Tạo Order
            const order = await prisma.order.create({
                data: {
                    userId: user.id,
                    showId: show.id,
                    status: status,
                    amount: amount,
                    currency: 'VND',
                    createdAt: orderDate,
                    updatedAt: orderDate
                }
            });
            ordersCreated++;

            // Tạo Tickets cho order (chỉ cho paid orders)
            if (status === 'paid') {
                for (let t = 0; t < quantity; t++) {
                    seatCounter++;
                    const row = Math.floor(seatCounter / 20);
                    const col = seatCounter % 20;
                    const seatId = generateSeatId(row, col);

                    try {
                        await prisma.ticket.create({
                            data: {
                                showId: show.id,
                                seatId: `S${show.id.substring(0, 4)}-${seatId}`, // Unique seatId per show
                                orderId: order.id,
                                code: generateTicketCode(),
                                createdAt: orderDate,
                                updatedAt: orderDate
                            }
                        });
                        ticketsCreated++;
                    } catch (ticketErr) {
                        // Skip duplicate seats
                    }
                }

                // Tạo Payment cho paid orders
                const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
                const paymentDate = new Date(orderDate);
                paymentDate.setMinutes(paymentDate.getMinutes() + 5);

                await prisma.payment.create({
                    data: {
                        orderId: order.id,
                        amount: amount,
                        provider: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                        status: paymentStatus,
                        currency: 'VND',
                        paidAt: paymentDate,
                        createdAt: paymentDate,
                        updatedAt: paymentDate
                    }
                });
                paymentsCreated++;
            }
        } catch (err) {
            console.log(`⚠️ Order ${i + 1}: ${err.message.substring(0, 60)}`);
        }
    }

    console.log(`\n✅ ĐÃ TẠO THÀNH CÔNG:`);
    console.log(`   📦 ${ordersCreated} orders`);
    console.log(`   🎫 ${ticketsCreated} tickets (QUAN TRỌNG cho "Tổng số vé đã bán")`);
    console.log(`   💳 ${paymentsCreated} payments`);

    // Thống kê chi tiết
    const totalTickets = await prisma.ticket.count();
    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.count({ where: { status: 'paid' } });
    const totalPayments = await prisma.payment.count();
    const totalRevenue = await prisma.order.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
    });

    console.log('\n📊 THỐNG KÊ DASHBOARD:');
    console.log(`   🎫 Tổng số vé đã bán: ${totalTickets}`);
    console.log(`   💰 Tổng doanh thu: ${(totalRevenue._sum.amount || 0).toLocaleString()} VND`);
    console.log(`   � Tổng đơn hàng: ${totalOrders}`);
    console.log(`   ✅ Đơn thành công: ${paidOrders}`);
    console.log(`   💳 Thanh toán: ${totalPayments}`);
}

seedCompleteData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
