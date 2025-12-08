/**
 * Script để migrate các Show cũ từ seatMapId (string) sang seatMapDbId (UUID)
 * 
 * Chạy: node scripts/migrate_seatmap_to_db.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ packages/db/prisma
dotenv.config({ path: join(__dirname, '..', 'packages', 'db', 'prisma', '.env') });

const prisma = new PrismaClient();

async function migrateSeatMaps() {
    console.log('🚀 Bắt đầu migrate seatMapId → seatMapDbId...\n');

    try {
        // 1. Lấy tất cả Shows có seatMapId nhưng chưa có seatMapDbId
        const showsToMigrate = await prisma.show.findMany({
            where: {
                seatMapId: { not: null },
                seatMapDbId: null,
                deletedAt: null,
            },
            select: {
                id: true,
                seatMapId: true,
            },
        });

        console.log(`📊 Tìm thấy ${showsToMigrate.length} shows cần migrate\n`);

        if (showsToMigrate.length === 0) {
            console.log('✅ Không có show nào cần migrate!');
            return;
        }

        // 2. Lấy tất cả SeatMap từ DB để map
        const seatMaps = await prisma.seatMap.findMany({
            select: {
                id: true,
                name: true,
            },
        });

        // ===== Helpers for fuzzy search =====
        const removeDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalize = (s = '') => {
            return removeDiacritics(String(s))
                .toLowerCase()
                .replace(/^map[_-]*/, '')        // bỏ tiền tố map_
                .replace(/[^a-z0-9]+/g, ' ')     // non-alnum -> space
                .trim()
                .replace(/\s+/g, ' ');
        };
        const toTokens = (s) => new Set(normalize(s).split(' ').filter(Boolean));

        // Build index for all seatmaps
        const seatMapIndex = seatMaps.map((sm) => {
            const idNorm = normalize(sm.id);
            const nameNorm = normalize(sm.name);
            const idTokens = toTokens(sm.id);
            const nameTokens = toTokens(sm.name);
            return { id: sm.id, name: sm.name, idNorm, nameNorm, idTokens, nameTokens };
        });

        function scoreCandidate(oldId, candidate) {
            const oldNorm = normalize(oldId);
            const oldTokens = toTokens(oldId);

            // Exact id match
            if (candidate.id === oldId) return 100;
            // Exact normalized match on id/name
            if (candidate.idNorm === oldNorm || candidate.nameNorm === oldNorm) return 95;

            let score = 0;
            // Contains relationships
            if (candidate.idNorm.includes(oldNorm) || oldNorm.includes(candidate.idNorm)) score = Math.max(score, 85);
            if (candidate.nameNorm.includes(oldNorm) || oldNorm.includes(candidate.nameNorm)) score = Math.max(score, 80);

            // Token coverage: all tokens exist in id/name tokens
            const allInId = [...oldTokens].every(t => candidate.idTokens.has(t));
            const allInName = [...oldTokens].every(t => candidate.nameTokens.has(t));
            if (allInId || allInName) score = Math.max(score, 78);

            // Token overlap count
            const overlapId = [...oldTokens].filter(t => candidate.idTokens.has(t)).length;
            const overlapName = [...oldTokens].filter(t => candidate.nameTokens.has(t)).length;
            const overlap = Math.max(overlapId, overlapName);
            score = Math.max(score, 60 + Math.min(overlap, 5) * 4); // max +20

            return score;
        }

        function findBestSeatmap(oldId) {
            // 1) Fast exact id
            const byId = seatMaps.find(x => x.id === oldId);
            if (byId) return byId.id;

            // 2) Fuzzy by score
            let best = { id: null, score: -1 };
            for (const cand of seatMapIndex) {
                const s = scoreCandidate(oldId, cand);
                if (s > best.score) best = { id: cand.id, score: s };
            }
            // Accept only if confident enough
            return best.score >= 70 ? best.id : null;
        }

        // 3. Thử map seatMapId (string) sang seatMapDbId (UUID)
        // Logic: tìm SeatMap có id hoặc name khớp với seatMapId
        let migrated = 0;
        let failed = 0;
        const failedShows = [];

        for (const show of showsToMigrate) {
            const oldSeatMapId = show.seatMapId;
            
            // Tìm best match từ index đã build
            const bestId = findBestSeatmap(oldSeatMapId);

            if (bestId) {
                // Update show với seatMapDbId mới
                await prisma.show.update({
                    where: { id: show.id },
                    data: {
                        seatMapDbId: bestId,
                        // Giữ lại seatMapId cũ để backup (hoặc xóa nếu muốn)
                        // seatMapId: null, // Uncomment nếu muốn xóa seatMapId sau khi migrate
                    },
                });
                console.log(`✅ Show ${show.id}: ${oldSeatMapId} → ${bestId}`);
                migrated++;
            } else {
                console.warn(`⚠️  Show ${show.id}: Không tìm thấy SeatMap cho "${oldSeatMapId}"`);
                failed++;
                failedShows.push({ showId: show.id, seatMapId: oldSeatMapId });
            }
        }

        console.log(`\n📈 Kết quả:`);
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ❌ Failed: ${failed}`);

        if (failedShows.length > 0) {
            console.log(`\n⚠️  Các show không migrate được:`);
            failedShows.forEach(({ showId, seatMapId }) => {
                console.log(`   - Show ${showId}: seatMapId="${seatMapId}"`);
            });
            console.log(`\n💡 Bạn cần tạo SeatMap mới hoặc map thủ công cho các show này.`);
        }

    } catch (error) {
        console.error('❌ Lỗi khi migrate:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Chạy migration
migrateSeatMaps()
    .then(() => {
        console.log('\n✅ Migration hoàn tất!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration thất bại:', error);
        process.exit(1);
    });

