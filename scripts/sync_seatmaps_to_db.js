/**
 * Script tổng hợp để đồng bộ hóa seatmaps vào database
 * - Seed tất cả seatmaps từ files vào DB
 * - Cập nhật tất cả shows để có seatMapDbId đúng
 * - Đảm bảo tất cả shows đều có seatmap
 * 
 * Chạy: node scripts/sync_seatmaps_to_db.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env từ packages/db/prisma
dotenv.config({ path: path.join(__dirname, '..', 'packages', 'db', 'prisma', '.env') });

const prisma = new PrismaClient();

/** ====== Resolve seatmap directory ====== */
function findProjectRoot(startDir = path.resolve(__dirname, '..')) {
    let dir = startDir;
    while (dir !== path.parse(dir).root) {
        if (fssync.existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    return startDir;
}

const PROJECT_ROOT = findProjectRoot();
const SEATMAP_DIR = path.join(PROJECT_ROOT, 'packages', 'db', 'seatmaps');

/** ====== Read seatmap files ====== */
async function readSeatmapFiles(dir = SEATMAP_DIR) {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'seatmaps_pack.json');
    const list = [];
    for (const f of files) {
        const filePath = path.join(dir, f);
        const raw = await fs.readFile(filePath, 'utf-8');
        try {
            const data = JSON.parse(raw);
            const id = data.id || path.basename(f, '.json');
            list.push({ id, file: f, data, filePath });
        } catch (e) {
            console.warn(`⚠️  Skip invalid JSON: ${f} - ${e.message}`);
        }
    }
    return list;
}

/** ====== Seed SeatMap table ====== */
async function seedSeatMapTable() {
    console.log('📦 Đang đọc seatmap files...');
    const seatmaps = await readSeatmapFiles(SEATMAP_DIR);
    console.log(`✓ Tìm thấy ${seatmaps.length} seatmap files\n`);

    if (seatmaps.length === 0) {
        console.error('❌ Không tìm thấy seatmap files!');
        return [];
    }

    // Lấy tất cả seatmaps hiện có trong DB
    const existingSeatmaps = await prisma.seatMap.findMany({
        select: { id: true, name: true },
    });
    const existingIds = new Set(existingSeatmaps.map(s => s.id));
    
    // Tìm các seatmap mới chưa có trong DB
    const newSeatmaps = seatmaps.filter(m => !existingIds.has(m.id));
    const existingSeatmapsToUpdate = seatmaps.filter(m => existingIds.has(m.id));
    
    console.log(`📊 Trạng thái:`);
    console.log(`   - Đã có trong DB: ${existingSeatmaps.length}`);
    console.log(`   - Cần thêm mới: ${newSeatmaps.length}`);
    console.log(`   - Cần cập nhật: ${existingSeatmapsToUpdate.length}\n`);

    // Thêm seatmaps mới
    if (newSeatmaps.length > 0) {
        console.log(`📦 Đang thêm ${newSeatmaps.length} seatmaps mới vào database...`);
        
        await prisma.$transaction(
            newSeatmaps.map((m) =>
                prisma.seatMap.create({
                    data: {
                        id: m.id,
                        name: m.data.name || m.id,
                        schema: m.data,
                    },
                })
            ),
            { timeout: 60000 }
        );
        
        console.log(`✓ Đã thêm ${newSeatmaps.length} seatmaps mới\n`);
    }

    // Cập nhật seatmaps đã có (nếu schema thay đổi)
    if (existingSeatmapsToUpdate.length > 0) {
        console.log(`🔄 Đang cập nhật ${existingSeatmapsToUpdate.length} seatmaps...`);
        let updated = 0;
        
        for (const m of existingSeatmapsToUpdate) {
            try {
                await prisma.seatMap.update({
                    where: { id: m.id },
                    data: {
                        name: m.data.name || m.id,
                        schema: m.data,
                    },
                });
                updated++;
            } catch (e) {
                console.warn(`⚠️  Không thể cập nhật seatmap ${m.id}: ${e.message}`);
            }
        }
        
        console.log(`✓ Đã cập nhật ${updated} seatmaps\n`);
    }

    return seatmaps;
}

/** ====== Cập nhật shows không có seatmap ====== */
async function updateShowsWithoutSeatmap() {
    console.log('🔍 Đang kiểm tra shows không có seatmap...');
    
    // Lấy tất cả seatmaps từ DB
    const seatmaps = await prisma.seatMap.findMany({
        select: { id: true, name: true },
    });
    
    if (seatmaps.length === 0) {
        console.error('❌ Không có seatmap nào trong database! Vui lòng seed seatmaps trước.');
        return;
    }
    
    const seatmapIds = seatmaps.map(s => s.id);
    
    // Tìm tất cả shows chưa có seatMapDbId
    const showsWithoutSeatmap = await prisma.show.findMany({
        where: {
            OR: [
                { seatMapDbId: null },
                { seatMapDbId: '' },
            ],
            deletedAt: null,
        },
        select: {
            id: true,
            eventId: true,
            seatMapId: true,
            venue: true,
        },
        include: {
            event: {
                select: {
                    name: true,
                    venue: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (showsWithoutSeatmap.length === 0) {
        console.log('✓ Tất cả shows đã có seatmap!\n');
        return;
    }

    console.log(`📋 Tìm thấy ${showsWithoutSeatmap.length} shows chưa có seatmap\n`);
    console.log('🔄 Đang gán seatmap cho các shows...\n');

    let updated = 0;
    let errors = 0;
    const updateLog = [];

    for (const show of showsWithoutSeatmap) {
        try {
            let selectedSeatmapId = null;
            
            // Nếu có seatMapId cũ, thử tìm seatmap tương ứng
            if (show.seatMapId) {
                const matchingSeatmap = await prisma.seatMap.findFirst({
                    where: {
                        OR: [
                            { id: show.seatMapId },
                            { name: { contains: show.seatMapId, mode: 'insensitive' } },
                        ],
                    },
                    select: { id: true },
                });
                
                if (matchingSeatmap) {
                    selectedSeatmapId = matchingSeatmap.id;
                }
            }
            
            // Nếu không tìm thấy, chọn seatmap ngẫu nhiên
            if (!selectedSeatmapId) {
                selectedSeatmapId = seatmapIds[Math.floor(Math.random() * seatmapIds.length)];
            }
            
            await prisma.show.update({
                where: { id: show.id },
                data: {
                    seatMapDbId: selectedSeatmapId,
                    // Giữ lại seatMapId cũ để tương thích
                    seatMapId: show.seatMapId || selectedSeatmapId,
                },
            });
            
            updated++;
            updateLog.push({
                showId: show.id,
                eventName: show.event?.name || 'N/A',
                oldSeatMapId: show.seatMapId || 'null',
                newSeatMapDbId: selectedSeatmapId,
            });
            
            if (updated % 10 === 0) {
                console.log(`  ✓ Đã cập nhật ${updated}/${showsWithoutSeatmap.length} shows...`);
            }
        } catch (e) {
            console.error(`  ❌ Lỗi khi cập nhật show ${show.id}: ${e.message}`);
            errors++;
        }
    }

    console.log(`\n✅ Đã cập nhật ${updated} shows với seatmap`);
    if (errors > 0) {
        console.log(`⚠️  ${errors} shows không thể cập nhật`);
    }
    
    // Hiển thị một số ví dụ
    if (updateLog.length > 0) {
        console.log('\n📝 Một số ví dụ cập nhật:');
        updateLog.slice(0, 5).forEach(log => {
            console.log(`   - Show ${log.showId.substring(0, 8)}... (${log.eventName}): ${log.oldSeatMapId} → ${log.newSeatMapDbId}`);
        });
        if (updateLog.length > 5) {
            console.log(`   ... và ${updateLog.length - 5} shows khác`);
        }
    }
    
    console.log('');
}

/** ====== Migrate seatMapId cũ sang seatMapDbId ====== */
async function migrateOldSeatMapIds() {
    console.log('🔄 Đang migrate seatMapId cũ sang seatMapDbId...\n');
    
    // Tìm shows có seatMapId nhưng chưa có seatMapDbId
    const showsToMigrate = await prisma.show.findMany({
        where: {
            seatMapId: { not: null },
            OR: [
                { seatMapDbId: null },
                { seatMapDbId: '' },
            ],
            deletedAt: null,
        },
        select: {
            id: true,
            seatMapId: true,
        },
    });

    if (showsToMigrate.length === 0) {
        console.log('✓ Không có show nào cần migrate!\n');
        return;
    }

    console.log(`📋 Tìm thấy ${showsToMigrate.length} shows cần migrate\n`);

    let migrated = 0;
    let failed = 0;
    const failedShows = [];

    for (const show of showsToMigrate) {
        const oldSeatMapId = show.seatMapId;
        
        // Tìm SeatMap trong DB
        let seatMapDb = await prisma.seatMap.findFirst({
            where: {
                OR: [
                    { id: oldSeatMapId },
                    { name: { contains: oldSeatMapId, mode: 'insensitive' } },
                ],
            },
            select: { id: true },
        });

        // Nếu không tìm thấy, thử tìm theo pattern
        if (!seatMapDb) {
            const parts = oldSeatMapId.replace(/^map_/, '').split('_');
            if (parts.length > 0) {
                seatMapDb = await prisma.seatMap.findFirst({
                    where: {
                        name: {
                            contains: parts[0],
                            mode: 'insensitive',
                        },
                    },
                    select: { id: true },
                });
            }
        }

        if (seatMapDb) {
            await prisma.show.update({
                where: { id: show.id },
                data: {
                    seatMapDbId: seatMapDb.id,
                },
            });
            migrated++;
        } else {
            failed++;
            failedShows.push({ showId: show.id, seatMapId: oldSeatMapId });
        }
    }

    console.log(`✅ Migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}\n`);

    if (failedShows.length > 0) {
        console.log(`⚠️  Các show không migrate được:`);
        failedShows.slice(0, 10).forEach(({ showId, seatMapId }) => {
            console.log(`   - Show ${showId}: seatMapId="${seatMapId}"`);
        });
        if (failedShows.length > 10) {
            console.log(`   ... và ${failedShows.length - 10} shows khác`);
        }
        console.log('');
    }
}

/** ====== Thống kê ====== */
async function printStatistics() {
    console.log('📊 Thống kê:\n');
    
    const totalSeatmaps = await prisma.seatMap.count();
    const totalShows = await prisma.show.count({
        where: { deletedAt: null },
    });
    const showsWithSeatmap = await prisma.show.count({
        where: {
            seatMapDbId: { not: null },
            deletedAt: null,
        },
    });
    const showsWithoutSeatmap = totalShows - showsWithSeatmap;
    
    console.log(`   - Tổng số seatmaps: ${totalSeatmaps}`);
    console.log(`   - Tổng số shows: ${totalShows}`);
    console.log(`   - Shows có seatmap: ${showsWithSeatmap}`);
    console.log(`   - Shows chưa có seatmap: ${showsWithoutSeatmap}\n`);
}

/** ====== Main ====== */
async function main() {
    try {
        console.log('🚀 Bắt đầu đồng bộ hóa seatmaps vào database...\n');
        console.log(`📁 Seatmap directory: ${SEATMAP_DIR}\n`);
        
        // 1. Seed seatmaps vào DB
        await seedSeatMapTable();
        
        // 2. Migrate seatMapId cũ sang seatMapDbId
        await migrateOldSeatMapIds();
        
        // 3. Cập nhật shows không có seatmap
        await updateShowsWithoutSeatmap();
        
        // 4. Thống kê
        await printStatistics();
        
        console.log('✅ Hoàn tất!');
    } catch (e) {
        console.error('❌ Lỗi:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

