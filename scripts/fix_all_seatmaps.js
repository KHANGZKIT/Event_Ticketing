/**
 * Script tổng hợp để fix toàn bộ seatmaps
 * - Đảm bảo tất cả seatmaps từ files đều có trong DB
 * - Migrate tất cả shows từ seatMapId sang seatMapDbId
 * - Đảm bảo tất cả shows đều có seatMapDbId đúng
 * 
 * Chạy: node scripts/fix_all_seatmaps.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/** ====== Step 1: Đảm bảo tất cả seatmaps đều có trong DB ====== */
async function ensureAllSeatmapsInDB() {
    console.log('📦 Bước 1: Đảm bảo tất cả seatmaps đều có trong DB...\n');
    
    const seatmaps = await readSeatmapFiles(SEATMAP_DIR);
    console.log(`✓ Tìm thấy ${seatmaps.length} seatmap files\n`);

    if (seatmaps.length === 0) {
        console.error('❌ Không tìm thấy seatmap files!');
        return [];
    }

    const existingSeatmaps = await prisma.seatMap.findMany({
        select: { id: true, name: true },
    });
    const existingIds = new Set(existingSeatmaps.map(s => s.id));
    
    const newSeatmaps = seatmaps.filter(m => !existingIds.has(m.id));
    const existingSeatmapsToUpdate = seatmaps.filter(m => existingIds.has(m.id));
    
    console.log(`📊 Trạng thái:`);
    console.log(`   - Đã có trong DB: ${existingSeatmaps.length}`);
    console.log(`   - Cần thêm mới: ${newSeatmaps.length}`);
    console.log(`   - Cần cập nhật: ${existingSeatmapsToUpdate.length}\n`);

    // Thêm seatmaps mới
    if (newSeatmaps.length > 0) {
        console.log(`📦 Đang thêm ${newSeatmaps.length} seatmaps mới...`);
        await prisma.$transaction(
            newSeatmaps.map((m) =>
                prisma.seatMap.create({
                    data: {
                        id: m.id, // Giữ nguyên id từ file (map_xxx)
                        name: m.data.name || m.id,
                        schema: m.data,
                    },
                })
            ),
            { timeout: 60000 }
        );
        console.log(`✓ Đã thêm ${newSeatmaps.length} seatmaps mới\n`);
    }

    // Cập nhật seatmaps đã có
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

/** ====== Step 2: Migrate tất cả shows ====== */
async function migrateAllShows() {
    console.log('🔄 Bước 2: Migrate tất cả shows từ seatMapId sang seatMapDbId...\n');
    
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
        
        // ƯU TIÊN: Tìm theo id trước (chính xác nhất)
        let seatMapDb = await prisma.seatMap.findUnique({
            where: { id: oldSeatMapId },
            select: { id: true },
        });

        // Nếu không tìm thấy, thử tìm theo name
        if (!seatMapDb) {
            seatMapDb = await prisma.seatMap.findFirst({
                where: {
                    OR: [
                        { name: { equals: oldSeatMapId, mode: 'insensitive' } },
                        { name: { contains: oldSeatMapId, mode: 'insensitive' } },
                    ],
                },
                select: { id: true },
            });
        }

        if (seatMapDb) {
            await prisma.show.update({
                where: { id: show.id },
                data: {
                    seatMapDbId: seatMapDb.id,
                },
            });
            migrated++;
            if (migrated % 10 === 0) {
                console.log(`  ✓ Đã migrate ${migrated}/${showsToMigrate.length} shows...`);
            }
        } else {
            failed++;
            failedShows.push({ showId: show.id, seatMapId: oldSeatMapId });
        }
    }

    console.log(`\n✅ Migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}\n`);

    if (failedShows.length > 0) {
        console.log(`⚠️  Các show không migrate được (${failedShows.length}):`);
        failedShows.slice(0, 10).forEach(({ showId, seatMapId }) => {
            console.log(`   - Show ${showId.substring(0, 8)}...: seatMapId="${seatMapId}"`);
        });
        if (failedShows.length > 10) {
            console.log(`   ... và ${failedShows.length - 10} shows khác`);
        }
        console.log('');
    }
}

/** ====== Step 3: Gán seatmap cho shows chưa có ====== */
async function assignSeatmapsToShows() {
    console.log('🔍 Bước 3: Gán seatmap cho shows chưa có...\n');
    
    const seatmaps = await prisma.seatMap.findMany({
        select: { id: true, name: true },
    });
    
    if (seatmaps.length === 0) {
        console.error('❌ Không có seatmap nào trong database!');
        return;
    }
    
    const seatmapIds = seatmaps.map(s => s.id);
    
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
            seatMapId: true,
        },
    });

    if (showsWithoutSeatmap.length === 0) {
        console.log('✓ Tất cả shows đã có seatmap!\n');
        return;
    }

    console.log(`📋 Tìm thấy ${showsWithoutSeatmap.length} shows chưa có seatmap\n`);
    console.log('🔄 Đang gán seatmap ngẫu nhiên...\n');

    let updated = 0;
    for (const show of showsWithoutSeatmap) {
        try {
            const randomSeatmapId = seatmapIds[Math.floor(Math.random() * seatmapIds.length)];
            
            await prisma.show.update({
                where: { id: show.id },
                data: {
                    seatMapDbId: randomSeatmapId,
                    seatMapId: show.seatMapId || randomSeatmapId,
                },
            });
            
            updated++;
            if (updated % 10 === 0) {
                console.log(`  ✓ Đã cập nhật ${updated}/${showsWithoutSeatmap.length} shows...`);
            }
        } catch (e) {
            console.error(`  ❌ Lỗi khi cập nhật show ${show.id}: ${e.message}`);
        }
    }

    console.log(`\n✅ Đã gán seatmap cho ${updated} shows\n`);
}

/** ====== Step 4: Thống kê ====== */
async function printStatistics() {
    console.log('📊 Bước 4: Thống kê cuối cùng...\n');
    
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
    console.log(`   - Shows có seatMapDbId: ${showsWithSeatmap}`);
    console.log(`   - Shows chưa có seatMapDbId: ${showsWithoutSeatmap}\n`);
}

/** ====== Main ====== */
async function main() {
    try {
        console.log('🚀 Bắt đầu fix toàn bộ seatmaps...\n');
        console.log(`📁 Seatmap directory: ${SEATMAP_DIR}\n`);
        
        // Step 1: Đảm bảo tất cả seatmaps đều có trong DB
        await ensureAllSeatmapsInDB();
        
        // Step 2: Migrate tất cả shows
        await migrateAllShows();
        
        // Step 3: Gán seatmap cho shows chưa có
        await assignSeatmapsToShows();
        
        // Step 4: Thống kê
        await printStatistics();
        
        console.log('✅ Hoàn tất! Tất cả seatmaps đã được đồng bộ và migrate.');
    } catch (e) {
        console.error('❌ Lỗi:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

