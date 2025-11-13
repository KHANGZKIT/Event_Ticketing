/**
 * Script để kiểm tra và dọn dẹp holds trong Redis
 * 
 * Chạy: node scripts/check_redis_holds.js [showId]
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', 'packages', 'db', 'prisma', '.env') });

// Tạo Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const prisma = new PrismaClient();

async function checkRedisHolds(showId = null) {
    try {
        console.log('🔍 Đang kiểm tra holds trong Redis...\n');
        
        // Lấy tất cả keys có pattern held:*
        const pattern = showId ? `held:${showId}:*` : 'held:*';
        const keys = [];
        
        // Redis SCAN để lấy tất cả keys
        let cursor = '0';
        do {
            const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = result[0];
            keys.push(...result[1]);
        } while (cursor !== '0');
        
        console.log(`📊 Tìm thấy ${keys.length} hold keys trong Redis\n`);
        
        if (keys.length === 0) {
            console.log('✅ Không có hold nào trong Redis');
            return;
        }
        
        // Nhóm theo showId
        const holdsByShow = {};
        for (const key of keys) {
            const parts = key.split(':');
            if (parts.length >= 3) {
                const showId = parts[1];
                const seatId = parts.slice(2).join(':');
                if (!holdsByShow[showId]) {
                    holdsByShow[showId] = [];
                }
                const holdId = await redis.get(key);
                const ttl = await redis.ttl(key);
                holdsByShow[showId].push({
                    seatId,
                    holdId,
                    ttl,
                    key
                });
            }
        }
        
        // Hiển thị thông tin
        for (const [showId, seats] of Object.entries(holdsByShow)) {
            console.log(`\n📋 Show ID: ${showId}`);
            console.log(`   Số ghế đang được hold: ${seats.length}`);
            
            // Lấy thông tin show từ DB
            try {
                const show = await prisma.show.findUnique({
                    where: { id: showId },
                    select: {
                        id: true,
                        event: {
                            select: {
                                name: true
                            }
                        }
                    }
                });
                
                if (show) {
                    console.log(`   Event: ${show.event?.name || 'N/A'}`);
                }
            } catch (e) {
                console.log(`   ⚠️  Không tìm thấy show trong DB`);
            }
            
            // Hiển thị một số ghế
            const sampleSeats = seats.slice(0, 10);
            console.log(`   Ví dụ các ghế đang được hold:`);
            for (const seat of sampleSeats) {
                const minutes = Math.floor(seat.ttl / 60);
                const seconds = seat.ttl % 60;
                console.log(`     - ${seat.seatId}: holdId=${seat.holdId?.substring(0, 8)}..., TTL=${minutes}m${seconds}s`);
            }
            if (seats.length > 10) {
                console.log(`     ... và ${seats.length - 10} ghế khác`);
            }
        }
        
        // Tùy chọn: Xóa tất cả holds (uncomment để dùng)
        // console.log('\n🗑️  Xóa tất cả holds...');
        // for (const key of keys) {
        //     await redis.del(key);
        // }
        // console.log('✅ Đã xóa tất cả holds');
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await prisma.$disconnect();
        await redis.quit();
    }
}

// Lấy showId từ command line argument
const showId = process.argv[2] || null;
checkRedisHolds(showId);

