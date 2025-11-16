// Import dữ liệu từ file JSON vào database
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env từ packages/db/prisma
dotenv.config({ path: path.join(__dirname, '..', 'packages', 'db', 'prisma', '.env') });

// Kiểm tra DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ Không tìm thấy DATABASE_URL trong .env');
    console.error('📁 Đảm bảo file .env tồn tại tại: packages/db/prisma/.env');
    process.exit(1);
}

const prisma = new PrismaClient();

async function importData(filePath) {
    console.log('📥 Bắt đầu import dữ liệu...\n');

    try {
        // Đọc file JSON
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const exportData = JSON.parse(fileContent);

        console.log(`📁 File: ${filePath}`);
        console.log(`📅 Exported at: ${exportData.exportedAt}`);
        console.log(`📊 Version: ${exportData.version}\n`);

        const { data, statistics } = exportData;

        // 1. Import Roles
        console.log('→ Importing Roles...');
        for (const role of data.roles) {
            await prisma.role.upsert({
                where: { id: role.id },
                update: { name: role.name },
                create: {
                    id: role.id,
                    name: role.name
                }
            });
        }
        console.log(`  ✓ Imported ${data.roles.length} roles`);

        // 2. Import Venues
        console.log('→ Importing Venues...');
        const venueMap = new Map();
        for (const venue of data.venues) {
            const created = await prisma.venue.upsert({
                where: { id: venue.id },
                update: {
                    name: venue.name,
                    city: venue.city,
                    address: venue.address
                },
                create: {
                    id: venue.id,
                    name: venue.name,
                    city: venue.city,
                    address: venue.address,
                    createdAt: new Date(venue.createdAt)
                }
            });
            venueMap.set(venue.id, created.id);
        }
        console.log(`  ✓ Imported ${data.venues.length} venues`);

        // 3. Import SeatMaps
        console.log('→ Importing SeatMaps...');
        const seatMapMap = new Map();
        for (const seatMap of data.seatMaps) {
            const created = await prisma.seatMap.upsert({
                where: { id: seatMap.id },
                update: {
                    name: seatMap.name,
                    schema: seatMap.schema
                },
                create: {
                    id: seatMap.id,
                    name: seatMap.name,
                    schema: seatMap.schema,
                    createdAt: new Date(seatMap.createdAt)
                }
            });
            seatMapMap.set(seatMap.id, created.id);
        }
        console.log(`  ✓ Imported ${data.seatMaps.length} seatmaps`);

        // 4. Import Events
        console.log('→ Importing Events...');
        const eventMap = new Map();
        for (const event of data.events) {
            const created = await prisma.event.upsert({
                where: { id: event.id },
                update: {
                    name: event.name,
                    city: event.city,
                    cover: event.cover,
                    startsAt: event.startsAt ? new Date(event.startsAt) : null,
                    category: event.category,
                    venueId: event.venueId,
                    updatedAt: new Date()
                },
                create: {
                    id: event.id,
                    name: event.name,
                    city: event.city,
                    cover: event.cover,
                    startsAt: event.startsAt ? new Date(event.startsAt) : null,
                    category: event.category,
                    venueId: event.venueId,
                    createdAt: new Date(event.createdAt),
                    updatedAt: new Date(event.updatedAt || event.createdAt)
                }
            });
            eventMap.set(event.id, created.id);
        }
        console.log(`  ✓ Imported ${data.events.length} events`);

        // 5. Import Shows
        console.log('→ Importing Shows...');
        const showMap = new Map();
        for (const show of data.shows) {
            const created = await prisma.show.upsert({
                where: { id: show.id },
                update: {
                    eventId: show.eventId,
                    startsAt: new Date(show.startsAt),
                    venue: show.venue,
                    venueDbId: show.venueDbId,
                    seatMapId: show.seatMapId,
                    seatMapDbId: show.seatMapDbId,
                    status: show.status,
                    updatedAt: new Date()
                },
                create: {
                    id: show.id,
                    eventId: show.eventId,
                    startsAt: new Date(show.startsAt),
                    venue: show.venue,
                    venueDbId: show.venueDbId,
                    seatMapId: show.seatMapId,
                    seatMapDbId: show.seatMapDbId,
                    status: show.status,
                    createdAt: new Date(show.createdAt),
                    updatedAt: new Date(show.updatedAt || show.createdAt)
                }
            });
            showMap.set(show.id, created.id);
        }
        console.log(`  ✓ Imported ${data.shows.length} shows`);

        // 6. Import Users (tạo password mặc định)
        console.log('→ Importing Users...');
        const DEFAULT_PASSWORD = 'Password@123';
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const userMap = new Map();

        for (const user of data.users) {
            const created = await prisma.user.upsert({
                where: { id: user.id },
                update: {
                    email: user.email,
                    fullName: user.fullName
                },
                create: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    passwordHash: passwordHash, // Mật khẩu mặc định
                    createdAt: new Date(user.createdAt)
                }
            });
            userMap.set(user.id, created.id);

            // Gán roles cho user
            if (user.roles && user.roles.length > 0) {
                for (const roleName of user.roles) {
                    const role = await prisma.role.findUnique({
                        where: { name: roleName }
                    });
                    if (role) {
                        await prisma.userRole.upsert({
                            where: {
                                userId_roleId: {
                                    userId: created.id,
                                    roleId: role.id
                                }
                            },
                            update: {},
                            create: {
                                userId: created.id,
                                roleId: role.id
                            }
                        });
                    }
                }
            }
        }
        console.log(`  ✓ Imported ${data.users.length} users`);
        console.log(`  ⚠️  Tất cả users có password mặc định: ${DEFAULT_PASSWORD}`);

        // 7. Import Orders
        console.log('→ Importing Orders...');
        for (const order of data.orders) {
            await prisma.order.upsert({
                where: { id: order.id },
                update: {
                    userId: order.userId,
                    showId: order.showId,
                    amount: order.amount,
                    currency: order.currency,
                    status: order.status,
                    updatedAt: new Date()
                },
                create: {
                    id: order.id,
                    userId: order.userId,
                    showId: order.showId,
                    amount: order.amount,
                    currency: order.currency,
                    status: order.status,
                    createdAt: new Date(order.createdAt),
                    updatedAt: new Date(order.updatedAt || order.createdAt)
                }
            });
        }
        console.log(`  ✓ Imported ${data.orders.length} orders`);

        // 8. Import Tickets
        console.log('→ Importing Tickets...');
        for (const ticket of data.tickets) {
            await prisma.ticket.upsert({
                where: { id: ticket.id },
                update: {
                    showId: ticket.showId,
                    seatId: ticket.seatId,
                    orderId: ticket.orderId,
                    code: ticket.code,
                    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt) : null,
                    updatedAt: new Date()
                },
                create: {
                    id: ticket.id,
                    showId: ticket.showId,
                    seatId: ticket.seatId,
                    orderId: ticket.orderId,
                    code: ticket.code,
                    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt) : null,
                    createdAt: new Date(ticket.createdAt),
                    updatedAt: new Date(ticket.updatedAt || ticket.createdAt)
                }
            });
        }
        console.log(`  ✓ Imported ${data.tickets.length} tickets`);

        console.log('\n✅ Import hoàn tất!');
        console.log('\n📊 Thống kê đã import:');
        console.log(`   - Roles: ${statistics.roles}`);
        console.log(`   - Users: ${statistics.users}`);
        console.log(`   - Venues: ${statistics.venues}`);
        console.log(`   - SeatMaps: ${statistics.seatMaps}`);
        console.log(`   - Events: ${statistics.events}`);
        console.log(`   - Shows: ${statistics.shows}`);
        console.log(`   - Orders: ${statistics.orders}`);
        console.log(`   - Tickets: ${statistics.tickets}`);
        console.log(`\n⚠️  Lưu ý: Tất cả users có password mặc định: ${DEFAULT_PASSWORD}`);

    } catch (error) {
        console.error('❌ Lỗi khi import:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Lấy file path từ command line argument
const filePath = process.argv[2] 
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(__dirname, '../data_export.json');

importData(filePath)
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

