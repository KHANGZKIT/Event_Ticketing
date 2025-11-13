import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(startDir = path.resolve(__dirname, "..")) {
    let dir = startDir;
    while (dir !== path.parse(dir).root) {
        if (fssync.existsSync(path.join(dir, "package.json"))) return dir;
        dir = path.dirname(dir);
    }
    return startDir;
}

const PROJECT_ROOT = findProjectRoot();
const SEATMAP_DIR = path.join(PROJECT_ROOT, "packages", "db", "seatmaps");

async function readSeatmapFiles(dir = SEATMAP_DIR) {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json") && f !== "seatmaps_pack.json");
    const list = [];
    for (const f of files) {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        try {
            const data = JSON.parse(raw);
            const id = data.id || path.basename(f, ".json");
            list.push({ id, file: f, data });
        } catch (e) {
            console.warn("[seatmap] Skip invalid JSON:", f, e.message);
        }
    }
    return list;
}

/** ====== Seed SeatMap table if empty ====== */
async function seedSeatMapTableIfEmpty() {
    const seatmaps = await readSeatmapFiles(SEATMAP_DIR);
    const existingSeatmaps = await prisma.seatMap.findMany({
        select: { id: true },
    });
    const existingIds = new Set(existingSeatmaps.map(s => s.id));
    
    // Tìm các seatmap mới chưa có trong DB
    const newSeatmaps = seatmaps.filter(m => !existingIds.has(m.id));
    
    if (existingSeatmaps.length > 0) {
        console.log(`✓ SeatMap table already has ${existingSeatmaps.length} entries`);
    }
    
    if (newSeatmaps.length > 0) {
        console.log(`📦 Adding ${newSeatmaps.length} new seatmaps to database...`);
        
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
        
        console.log(`✓ Added ${newSeatmaps.length} new seatmaps`);
    } else {
        console.log(`✓ All seatmaps already in database`);
    }
    
    return seatmaps;
}

/** ====== Update shows without seatmap ====== */
async function updateShowsWithoutSeatmap() {
    // 1. Đảm bảo SeatMap table có dữ liệu
    const seatmaps = await seedSeatMapTableIfEmpty();
    
    if (seatmaps.length === 0) {
        console.error("❌ No seatmaps available!");
        return;
    }

    const seatmapIds = seatmaps.map(m => m.id);
    
    // 2. Tìm tất cả shows chưa có seatMapDbId
    const showsWithoutSeatmap = await prisma.show.findMany({
        where: {
            seatMapDbId: null,
            deletedAt: null,
            status: "scheduled",
        },
        select: {
            id: true,
            eventId: true,
            seatMapId: true,
        },
    });

    if (showsWithoutSeatmap.length === 0) {
        console.log("✓ All shows already have seatmaps assigned");
        return;
    }

    console.log(`📋 Found ${showsWithoutSeatmap.length} shows without seatmap`);
    console.log("🔄 Updating shows with seatmaps...");

    let updated = 0;
    let errors = 0;

    // 3. Gán seatmap ngẫu nhiên cho mỗi show
    for (const show of showsWithoutSeatmap) {
        try {
            // Chọn seatmap ngẫu nhiên
            const randomSeatmapId = seatmapIds[Math.floor(Math.random() * seatmapIds.length)];
            
            await prisma.show.update({
                where: { id: show.id },
                data: {
                    seatMapDbId: randomSeatmapId,
                    // Cũng cập nhật seatMapId (field cũ) để tương thích
                    seatMapId: show.seatMapId || randomSeatmapId,
                },
            });
            
            updated++;
            
            if (updated % 10 === 0) {
                console.log(`  ✓ Updated ${updated}/${showsWithoutSeatmap.length} shows...`);
            }
        } catch (e) {
            console.error(`  ❌ Error updating show ${show.id}:`, e.message);
            errors++;
        }
    }

    console.log(`\n✅ Successfully updated ${updated} shows with seatmaps`);
    if (errors > 0) {
        console.log(`⚠️  ${errors} shows failed to update`);
    }
}

/** ====== Main ====== */
async function main() {
    try {
        console.log("🚀 Starting seatmap update for shows...\n");
        await updateShowsWithoutSeatmap();
        console.log("\n✓ Done!");
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

