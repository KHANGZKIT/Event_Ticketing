// scripts/add_shows_to_existing_events.js
// Script để thêm show, seatmap và giá cho các event đã tồn tại nhưng chưa có show

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();

// Resolve seatmap directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEATMAP_DIR = path.join(PROJECT_ROOT, 'packages', 'db', 'seatmaps');

// Helper: Pick random element from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Random number between min and max (inclusive)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Venues theo thành phố
const VENUES = {
    "Hồ Chí Minh": [
        "Nhà hát Bến Thành",
        "Nhà thi đấu Quận 7",
        "Saigon Music Hall",
        "Nhà Văn hoá Thanh Niên",
    ],
    "Hà Nội": [
        "Nhà hát Lớn Hà Nội",
        "Trung tâm Hội nghị Quốc gia",
        "L'Espace",
        "Long Biên Stage",
    ],
    "Đà Nẵng": [
        "Trung tâm Hội nghị TP. Đà Nẵng",
        "Mỹ Khê Open Air",
        "Cầu Rồng Stage",
        "Nhà hát Trưng Vương",
    ],
};

// Fallback venues nếu không có city
const FALLBACK_VENUES = [
    "Trung tâm Hội nghị",
    "Nhà hát Thành phố",
    "Sân khấu Nghệ thuật",
    "Hội trường Sự kiện",
];

/**
 * Đọc seatmap template từ file
 */
async function loadSeatMapTemplate(seatMapId) {
    const filePath = path.join(SEATMAP_DIR, `${seatMapId}.json`);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Cannot load seatmap ${seatMapId}: ${err.message}`);
    }
}

/**
 * Lấy danh sách seatmap có sẵn
 */
async function getAvailableSeatmaps() {
    try {
        const files = (await fs.readdir(SEATMAP_DIR)).filter((f) => f.endsWith('.json'));
        return files.map((f) => path.basename(f, '.json'));
    } catch (err) {
        console.warn('⚠️  Không thể đọc thư mục seatmaps:', err.message);
        // Fallback: danh sách seatmap mặc định
        return [
            'map_theater_balcony',
            'map_concert_hall_large',
            'map_cinema_standard',
            'map_indoor_classic',
            'map_amphitheater'
        ];
    }
}

/**
 * Expand seats từ seatmap template
 */
function expandSeatsFromTemplate(tpl) {
    // dạng A: zones + rows {id,from,to}
    if (Array.isArray(tpl.zones)) {
        const seats = [];
        for (const z of tpl.zones) {
            for (const r of z.rows || []) {
                const from = Number(r.from);
                const to = Number(r.to);
                if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to)
                    continue;
                for (let n = from; n <= to; n++) {
                    seats.push({
                        seatId: `${r.id}${n}`,
                        zone: z.id,
                        tier: z.tier || z.id,
                    });
                }
            }
        }
        return seats;
    }

    // dạng B: preset grid
    if (Array.isArray(tpl.tiers)) {
        const seats = [];
        for (const t of tpl.tiers) {
            const rows = t.rows || 5;
            const cols = t.cols || 10;
            const startRow = t.startRow || 'A';
            for (let r = 0; r < rows; r++) {
                const rowLetter = String.fromCharCode(startRow.charCodeAt(0) + r);
                for (let c = 1; c <= cols; c++) {
                    seats.push({
                        seatId: `${rowLetter}${c}`,
                        zone: t.name,
                        tier: t.name,
                    });
                }
            }
        }
        return seats;
    }

    // dạng C: rows với name và count
    if (Array.isArray(tpl.rows)) {
        const seats = [];
        for (const row of tpl.rows) {
            const rowName = row.name || row.id;
            const count = Number(row.count);
            if (!rowName || Number.isNaN(count) || count <= 0) continue;
            for (let n = 1; n <= count; n++) {
                seats.push({
                    seatId: `${rowName}${n}`,
                    zone: 'Default',
                    tier: 'Default',
                });
            }
        }
        return seats;
    }

    throw new Error('Unsupported seatmap template structure');
}

/**
 * Lấy danh sách tiers từ seatmap template
 */
function deriveTiersFromTemplate(tpl) {
    // Trả về [{name, price?, capacity}]
    if (Array.isArray(tpl.zones)) {
        const priceByTier = tpl.priceTiers || {};
        return tpl.zones.map((z) => {
            let capacity = 0;
            for (const r of z.rows || []) {
                const from = Number(r.from);
                const to = Number(r.to);
                if (!r.id || Number.isNaN(from) || Number.isNaN(to) || from > to)
                    continue;
                capacity += to - from + 1;
            }
            return {
                name: z.tier || z.id,
                price: priceByTier[z.tier || z.id] ?? null,
                capacity,
            };
        });
    }

    if (Array.isArray(tpl.tiers)) {
        return tpl.tiers.map((t) => ({
            name: t.name,
            price: t.price ?? null,
            capacity: (t.rows || 5) * (t.cols || 10),
        }));
    }

    if (Array.isArray(tpl.rows)) {
        let totalCapacity = 0;
        for (const row of tpl.rows) {
            const count = Number(row.count);
            if (!Number.isNaN(count) && count > 0) {
                totalCapacity += count;
            }
        }
        const priceByTier = tpl.priceTiers || {};
        const defaultPrice = priceByTier['Default'] || priceByTier['STANDARD'] || 100000;
        
        return [{
            name: 'Default',
            price: defaultPrice,
            capacity: totalCapacity || 20,
        }];
    }

    throw new Error('Unsupported seatmap template structure');
}

/**
 * Tìm seatmap có sẵn từ các show đã completed để tái sử dụng
 */
async function findAvailableSeatMap(sourceSeatMapId) {
    // Tìm các show đã completed có cùng sourceSeatMapId
    const completedShows = await prisma.show.findMany({
        where: {
            seatMapId: sourceSeatMapId,
            status: 'completed',
            seatMapDbId: { not: null },
        },
        select: {
            seatMapDbId: true,
        },
        orderBy: {
            updatedAt: 'desc', // Lấy show mới nhất
        },
        take: 1,
    });

    if (completedShows.length > 0 && completedShows[0].seatMapDbId) {
        // Kiểm tra xem seatmap này có đang được sử dụng bởi show nào khác không
        const seatMapId = completedShows[0].seatMapDbId;
        const activeShows = await prisma.show.findFirst({
            where: {
                seatMapDbId: seatMapId,
                status: { in: ['scheduled', 'cancelled'] },
                deletedAt: null,
            },
        });

        // Nếu không có show nào đang sử dụng, có thể tái sử dụng
        if (!activeShows) {
            return seatMapId;
        }
    }

    return null;
}

/**
 * Gán seatmap cho show (tái sử dụng nếu có, hoặc tạo mới)
 */
async function assignSeatMapToShow(showId, sourceSeatMapId, template) {
    // Thử tìm seatmap có sẵn từ show đã completed
    const availableSeatMapId = await findAvailableSeatMap(sourceSeatMapId);

    if (availableSeatMapId) {
        // Tái sử dụng seatmap
        await prisma.show.update({
            where: { id: showId },
            data: {
                seatMapId: sourceSeatMapId,
                seatMapDbId: availableSeatMapId,
            },
        });
        return { id: availableSeatMapId, reused: true };
    }

    // Tạo seatmap mới
    const seatMapName = `show-${showId}-${Date.now()}`;
    const seatMapRecord = await prisma.seatMap.create({
        data: {
            name: seatMapName,
            schema: template,
        },
    });

    await prisma.show.update({
        where: { id: showId },
        data: {
            seatMapId: sourceSeatMapId,
            seatMapDbId: seatMapRecord.id,
        },
    });

    return { id: seatMapRecord.id, reused: false };
}

/**
 * Lấy venue cho event dựa vào city
 */
function getVenueForEvent(city) {
    if (city && VENUES[city]) {
        return pick(VENUES[city]);
    }
    return pick(FALLBACK_VENUES);
}

/**
 * Tạo một show với seatmap và tickets riêng
 */
async function createSingleShow(event, showIndex, totalShows) {
    // Chọn một seatmap ngẫu nhiên (mỗi show có seatmap riêng)
    const availableSeatmaps = await getAvailableSeatmaps();
    const seatMapId = pick(availableSeatmaps);
    
    // Load seatmap template
    const template = await loadSeatMapTemplate(seatMapId);
    
    // Validate template
    expandSeatsFromTemplate(template);
    
    // Tính ngày cho show (phân bổ trong khoảng 7-30 ngày)
    const baseDate = event.startsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const daysOffset = showIndex * rand(1, 3); // Mỗi show cách nhau 1-3 ngày
    const showStartsAt = new Date(baseDate);
    showStartsAt.setDate(showStartsAt.getDate() + daysOffset);
    
    // Lấy venue cho show
    const venue = getVenueForEvent(event.city);
    
    // Tạo show
    const show = await prisma.show.create({
        data: {
            eventId: event.id,
            startsAt: showStartsAt,
            venue: venue,
            seatMapId: seatMapId,
            status: 'scheduled',
        },
    });
    
    // Gán seatmap cho show (tái sử dụng nếu có, hoặc tạo mới)
    const seatMapResult = await assignSeatMapToShow(show.id, seatMapId, template);
    
    // Lấy tiers từ template
    const tiers = deriveTiersFromTemplate(template);
    
    // Tạo ShowTicketType với giá từ template (luôn tạo mới cho mỗi show)
    await prisma.$transaction(
        tiers.map((t) =>
            prisma.showTicketType.create({
                data: {
                    showId: show.id,
                    name: t.name,
                    price: t.price ?? 100000, // fallback nếu không có price
                    capacity: t.capacity,
                },
            })
        )
    );
    
    // Tạo tickets từ seatmap (luôn tạo mới cho mỗi show, dù seatmap có tái sử dụng)
    const seatObjs = expandSeatsFromTemplate(template);
    const allSeats = seatObjs.map((s) => s.seatId);
    
    // Chia batch để tránh SQL quá dài
    const BATCH = 1000;
    for (let i = 0; i < allSeats.length; i += BATCH) {
        const slice = allSeats.slice(i, i + BATCH);
        await prisma.$transaction(
            slice.map((seatId) => prisma.ticket.create({ data: { showId: show.id, seatId } })),
            { timeout: 60000 }
        );
    }
    
    return { 
        show, 
        seatCount: allSeats.length, 
        tierCount: tiers.length, 
        seatMapId, 
        venue,
        seatMapReused: seatMapResult.reused 
    };
}

/**
 * Tạo 1-2 show ngẫu nhiên cho một event
 */
async function createShowsForEvent(event) {
    try {
        // Tạo 1-2 show ngẫu nhiên
        const numShows = rand(1, 2);
        const results = [];
        
        for (let i = 0; i < numShows; i++) {
            const result = await createSingleShow(event, i, numShows);
            results.push(result);
        }
        
        return results;
    } catch (err) {
        console.error(`⚠️  Lỗi khi tạo show cho event ${event.id}:`, err.message);
        throw err;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🔍 Đang tìm các event chưa có show...\n');
        
        // Tìm các event chưa có show
        const eventsWithoutShows = await prisma.event.findMany({
            where: {
                deletedAt: null,
                shows: {
                    none: {
                        deletedAt: null,
                    },
                },
            },
            select: {
                id: true,
                name: true,
                startsAt: true,
                city: true,
            },
        });
        
        if (eventsWithoutShows.length === 0) {
            console.log('✅ Tất cả event đã có show!');
            return;
        }
        
        console.log(`📋 Tìm thấy ${eventsWithoutShows.length} event chưa có show:\n`);
        eventsWithoutShows.forEach((e, i) => {
            console.log(`   ${i + 1}. ${e.name} (${e.id})`);
        });
        
        console.log(`\n🎫 Bắt đầu tạo show cho ${eventsWithoutShows.length} event...\n`);
        
        const succeeded = [];
        const failed = [];
        
        for (let i = 0; i < eventsWithoutShows.length; i++) {
            const event = eventsWithoutShows[i];
            console.log(`[${i + 1}/${eventsWithoutShows.length}] ${event.name}`);
            
            try {
                const results = await createShowsForEvent(event);
                console.log(`   ✅ Đã tạo ${results.length} show:`);
                results.forEach((result, idx) => {
                    const reusedText = result.seatMapReused ? ' (tái sử dụng)' : ' (mới)';
                    console.log(`      Show ${idx + 1}: ${result.seatCount} ghế, ${result.tierCount} loại vé, seatmap: ${result.seatMapId}${reusedText}, venue: ${result.venue}`);
                });
                succeeded.push(event.id);
            } catch (err) {
                console.error(`   ❌ Lỗi: ${err.message}`);
                failed.push({ id: event.id, name: event.name, error: err.message });
            }
        }
        
        console.log(`\n📊 Kết quả:`);
        console.log(`   ✅ Thành công: ${succeeded.length}`);
        console.log(`   ❌ Thất bại: ${failed.length}`);
        
        if (failed.length > 0) {
            console.log(`\n⚠️  Các event thất bại:`);
            failed.forEach((f) => {
                console.log(`   - ${f.name} (${f.id}): ${f.error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });

