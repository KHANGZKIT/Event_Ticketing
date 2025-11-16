// Export dữ liệu từ database ra file JSON
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

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

async function exportData() {
    console.log('📦 Bắt đầu export dữ liệu...\n');
    console.log(`🔗 Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}\n`);

    try {
        // Export Roles
        console.log('→ Exporting Roles...');
        const roles = await prisma.role.findMany({
            orderBy: { id: 'asc' }
        });
        console.log(`  ✓ Exported ${roles.length} roles`);

        // Export Users (không export passwordHash)
        console.log('→ Exporting Users...');
        const users = await prisma.user.findMany({
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        const usersExport = users.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            createdAt: u.createdAt,
            roles: u.roles.map(ur => ur.role.name)
        }));
        console.log(`  ✓ Exported ${usersExport.length} users`);

        // Export Venues
        console.log('→ Exporting Venues...');
        const venues = await prisma.venue.findMany({
            orderBy: { createdAt: 'asc' }
        });
        console.log(`  ✓ Exported ${venues.length} venues`);

        // Export SeatMaps
        console.log('→ Exporting SeatMaps...');
        const seatMaps = await prisma.seatMap.findMany({
            orderBy: { createdAt: 'asc' }
        });
        console.log(`  ✓ Exported ${seatMaps.length} seatmaps`);

        // Export Events (chỉ events chưa bị xóa)
        console.log('→ Exporting Events...');
        const events = await prisma.event.findMany({
            where: {
                deletedAt: null
            },
            include: {
                venue: true
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`  ✓ Exported ${events.length} events`);

        // Export Shows (chỉ shows chưa bị xóa)
        console.log('→ Exporting Shows...');
        const shows = await prisma.show.findMany({
            where: {
                deletedAt: null
            },
            include: {
                event: true,
                venueDb: true,
                seatMapDb: true
            },
            orderBy: { createdAt: 'asc' }
        });
        const showsExport = shows.map(s => ({
            id: s.id,
            eventId: s.eventId,
            startsAt: s.startsAt,
            venue: s.venue,
            venueDbId: s.venueDbId,
            seatMapId: s.seatMapId,
            seatMapDbId: s.seatMapDbId,
            status: s.status,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }));
        console.log(`  ✓ Exported ${showsExport.length} shows`);

        // Export Orders
        console.log('→ Exporting Orders...');
        const orders = await prisma.order.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true
                    }
                },
                show: {
                    select: {
                        id: true,
                        eventId: true,
                        startsAt: true
                    }
                },
                tickets: true
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`  ✓ Exported ${orders.length} orders`);

        // Export Tickets
        console.log('→ Exporting Tickets...');
        const tickets = await prisma.ticket.findMany({
            include: {
                show: {
                    select: {
                        id: true,
                        eventId: true
                    }
                },
                order: {
                    select: {
                        id: true,
                        userId: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`  ✓ Exported ${tickets.length} tickets`);

        // Tạo object export
        const exportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            data: {
                roles,
                users: usersExport,
                venues,
                seatMaps,
                events,
                shows: showsExport,
                orders,
                tickets
            },
            statistics: {
                roles: roles.length,
                users: usersExport.length,
                venues: venues.length,
                seatMaps: seatMaps.length,
                events: events.length,
                shows: showsExport.length,
                orders: orders.length,
                tickets: tickets.length
            }
        };

        // Lưu vào file
        const outputPath = path.resolve(__dirname, '../data_export.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify(exportData, null, 2),
            'utf-8'
        );

        console.log('\n✅ Export hoàn tất!');
        console.log(`📁 File: ${outputPath}`);
        console.log('\n📊 Thống kê:');
        console.log(`   - Roles: ${exportData.statistics.roles}`);
        console.log(`   - Users: ${exportData.statistics.users}`);
        console.log(`   - Venues: ${exportData.statistics.venues}`);
        console.log(`   - SeatMaps: ${exportData.statistics.seatMaps}`);
        console.log(`   - Events: ${exportData.statistics.events}`);
        console.log(`   - Shows: ${exportData.statistics.shows}`);
        console.log(`   - Orders: ${exportData.statistics.orders}`);
        console.log(`   - Tickets: ${exportData.statistics.tickets}`);

    } catch (error) {
        console.error('❌ Lỗi khi export:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

exportData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

