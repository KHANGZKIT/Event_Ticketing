// scripts/scrape_single_event.js
// Script để scrape một sự kiện cụ thể từ URL ticketbox.vn

import puppeteer from 'puppeteer';
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

    // dạng B: preset grid (giữ tương thích)
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
 * Clone seatmap vào DB cho show
 */
async function cloneSeatMapForShow(showId, sourceSeatMapId, template) {
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

    return seatMapRecord;
}

/**
 * Tạo show với seatmap và tickets
 */
async function createShowWithSeatmap(event, eventData) {
    try {
        // Chọn một seatmap ngẫu nhiên
        const availableSeatmaps = await getAvailableSeatmaps();
        const seatMapId = pick(availableSeatmaps);
        
        console.log(`\n🎫 Đang tạo show với seatmap: ${seatMapId}...`);
        
        // Load seatmap template
        const template = await loadSeatMapTemplate(seatMapId);
        
        // Validate template
        expandSeatsFromTemplate(template);
        
        // Tạo show
        const showStartsAt = event.startsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau nếu không có ngày
        const show = await prisma.show.create({
            data: {
                eventId: event.id,
                startsAt: showStartsAt,
                venue: eventData.venueText || eventData.venueName || null,
                seatMapId: seatMapId,
                status: 'scheduled',
            },
        });
        
        // Clone seatmap vào DB
        await cloneSeatMapForShow(show.id, seatMapId, template);
        
        // Lấy tiers từ template
        const tiers = deriveTiersFromTemplate(template);
        
        // Áp dụng giá từ scrape nếu có
        const priceMin = eventData.priceMin || null;
        const priceMax = eventData.priceMax || null;
        
        // Nếu có giá từ scrape, phân bổ cho các tiers (ghi đè giá từ template)
        if (priceMin && tiers.length > 0) {
            if (tiers.length === 1) {
                // Nếu chỉ có 1 tier, dùng priceMin hoặc trung bình nếu có priceMax
                tiers[0].price = priceMax ? Math.round((priceMin + priceMax) / 2) : priceMin;
            } else {
                // Phân bổ giá từ min đến max cho các tiers
                // Tier đầu tiên = priceMin, tier cuối = priceMax (hoặc priceMin * 1.5 nếu không có priceMax)
                const finalMax = priceMax || Math.round(priceMin * 1.5);
                const priceStep = (finalMax - priceMin) / (tiers.length - 1);
                tiers.forEach((tier, index) => {
                    tier.price = Math.round(priceMin + priceStep * index);
                });
            }
        }
        // Nếu không có giá từ scrape, giữ nguyên giá từ template (nếu có)
        
        // Tạo ShowTicketType với giá
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
        
        // Tạo tickets từ seatmap
        const seatObjs = expandSeatsFromTemplate(template);
        const allSeats = seatObjs.map((s) => s.seatId);
        
        console.log(`   📍 Đang tạo ${allSeats.length} ghế...`);
        
        // Chia batch để tránh SQL quá dài
        const BATCH = 1000;
        for (let i = 0; i < allSeats.length; i += BATCH) {
            const slice = allSeats.slice(i, i + BATCH);
            await prisma.$transaction(
                slice.map((seatId) => prisma.ticket.create({ data: { showId: show.id, seatId } })),
                { timeout: 60000 }
            );
        }
        
        console.log(`✅ Đã tạo show với ${allSeats.length} ghế và ${tiers.length} loại vé`);
        console.log(`   Show ID: ${show.id}`);
        console.log(`   Các loại vé:`);
        tiers.forEach((t) => {
            console.log(`     - ${t.name}: ${(t.price || 100000).toLocaleString('vi-VN')} đ (${t.capacity} ghế)`);
        });
        
        return show;
    } catch (err) {
        console.error('⚠️  Lỗi khi tạo show:', err.message);
        throw err;
    }
}

/**
 * Parse date string từ format "19:30 - 22:00, 22 Tháng 11, 2025"
 */
function parseVietnameseDate(dateStr) {
    if (!dateStr) return null;

    try {
        // Map tên tháng tiếng Việt sang số
        const monthMap = {
            'tháng 1': '01', 'tháng 2': '02', 'tháng 3': '03',
            'tháng 4': '04', 'tháng 5': '05', 'tháng 6': '06',
            'tháng 7': '07', 'tháng 8': '08', 'tháng 9': '09',
            'tháng 10': '10', 'tháng 11': '11', 'tháng 12': '12'
        };

        // Extract ngày, tháng, năm từ string
        // Format: "HH:MM - HH:MM, DD Tháng MM, YYYY"
        const datePattern = /(\d{1,2})\s+Tháng\s+(\d{1,2}),?\s+(\d{4})/i;
        const timePattern = /(\d{1,2}):(\d{2})/;

        const dateMatch = dateStr.match(datePattern);
        const timeMatch = dateStr.match(timePattern);

        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];

            let hours = '19', minutes = '00'; // Default time
            if (timeMatch) {
                hours = timeMatch[1].padStart(2, '0');
                minutes = timeMatch[2].padStart(2, '0');
            }

            // Tạo ISO string
            const isoString = `${year}-${month}-${day}T${hours}:${minutes}:00+07:00`;
            const date = new Date(isoString);

            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        // Fallback: thử parse trực tiếp
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }

        return null;
    } catch (e) {
        console.warn('⚠️  Không thể parse ngày:', dateStr, e.message);
        return null;
    }
}

/**
 * Scrape thông tin một sự kiện từ URL
 */
async function scrapeSingleEvent(url) {
    if (!url || !url.includes('ticketbox.vn')) {
        console.error('❌ URL không hợp lệ. Phải là URL từ ticketbox.vn');
        process.exit(1);
    }

    console.log(`🚀 Đang scrape: ${url}\n`);

    const headlessMode = process.env.TICKETBOX_HEADLESS === 'false' ? false : 'new';
    const browser = await puppeteer.launch({
        headless: headlessMode,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage'
        ]
    });

    try {
        const page = await browser.newPage();

        // Giả lập trình duyệt thật tốt hơn
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setExtraHTTPHeaders({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        // Ẩn các dấu hiệu automation
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        console.log('⏳ Đang tải trang...');
        if (process.env.TICKETBOX_COOKIE) {
            await page.setExtraHTTPHeaders({ Cookie: process.env.TICKETBOX_COOKIE });
        }

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Đợi JavaScript load
        await new Promise((r) => setTimeout(r, 2500));

        // Kiểm tra xem có bị chặn không
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('captcha')) {
            console.error('❌ Trang web yêu cầu đăng nhập hoặc chặn bot');
            console.log('💡 Thử mở trình duyệt thủ công và copy cookie vào script');
            return;
        }

        await page.waitForSelector('body', { timeout: 10000 });

        console.log('📊 Đang trích xuất dữ liệu...\n');

        const eventData = await page.evaluate(() => {
            const data = {};

            // 1) Title - Ưu tiên theo meta/title, tránh nhầm "Giới thiệu"
            const BAD_TITLES = [
                'giới thiệu', 'gioi thieu', 'ticketbox verified account',
                'chính sách', 'policy', 'điều khoản', 'terms'
            ];
            const pickValidTitle = (t) => {
                if (!t) return null;
                const s = t.trim();
                const low = s.toLowerCase();
                if (BAD_TITLES.some((w) => low.includes(w))) return null;
                return s.replace(/\s*[-|—]\s*ticketbox.*$/i, '');
            };

            const metaOg = document.querySelector('meta[property="og:title"]');
            const metaTw = document.querySelector('meta[name="twitter:title"]');
            const docTitle = document.title;
            const h1 = document.querySelector('h1');
            const h2 = document.querySelector('h2');

            data.name =
                pickValidTitle(metaOg?.content) ||
                pickValidTitle(metaTw?.content) ||
                pickValidTitle(docTitle) ||
                pickValidTitle(h1?.textContent) ||
                pickValidTitle(h2?.textContent) ||
                null;

            // 2. Hình ảnh cover
            const imageSelectors = [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
                'img[class*="cover"]',
                'img[class*="banner"]',
                'img[class*="event"]',
                '.event-cover img',
                '.event-banner img',
                'img[src*="tkbcdn.com"]',
                'img[src*="ticketbox"]'
            ];
            for (const selector of imageSelectors) {
                if (selector.startsWith('meta')) {
                    const meta = document.querySelector(selector);
                    if (meta && meta.content && meta.content.includes('tkbcdn.com')) {
                        data.cover = meta.content;
                        break;
                    }
                } else {
                    const img = document.querySelector(selector);
                    if (img) {
                        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                        if (src && (src.includes('tkbcdn.com') || src.includes('ticketbox'))) {
                            data.cover = src;
                            break;
                        }
                    }
                }
            }

            // 3a. NGÀY GIỜ - Ưu tiên #data-text
            const dataTextEl = document.querySelector('p#data-text');
            if (dataTextEl) {
                data.startsAtRaw = dataTextEl.textContent.trim();
                data.startsAt = data.startsAtRaw;
            } else {
                // Fallback: time[datetime] hoặc các selector khác
                const dateSelectors = [
                    'time[datetime]',
                    '[class*="date"]',
                    '[class*="time"]',
                    'meta[property="event:start_time"]'
                ];
                for (const selector of dateSelectors) {
                    if (selector.startsWith('meta')) {
                        const meta = document.querySelector(selector);
                        if (meta && meta.content) {
                            data.startsAt = meta.content;
                            data.startsAtRaw = meta.content;
                            break;
                        }
                    } else {
                        const el = document.querySelector(selector);
                        if (el) {
                            const dateStr = el.getAttribute('datetime') || el.textContent.trim();
                            if (dateStr) {
                                data.startsAt = dateStr;
                                data.startsAtRaw = dateStr;
                                break;
                            }
                        }
                    }
                }
            }

            // 3b. VENUE & ADDRESS - Ưu tiên #venue .venue-text và #address
            const specificVenueEl = document.querySelector('p#venue .venue-text');
            const specificAddressEl = document.querySelector('p#address');

            if (specificVenueEl) {
                data.venueName = specificVenueEl.textContent.trim();
            }

            if (specificAddressEl) {
                data.addressText = specificAddressEl.textContent.trim();
            }

            // Nếu có cả venue và address, ghép lại thành venueText
            if (data.venueName && data.addressText) {
                data.venueText = `${data.venueName}, ${data.addressText}`;
            } else if (data.venueName) {
                data.venueText = data.venueName;
            } else if (data.addressText) {
                data.venueText = data.addressText;
            }

            // Fallback: nếu không tìm thấy các selector cụ thể
            if (!data.venueText) {
                const venueBlock =
                    document.querySelector('.event-location') ||
                    document.querySelector('.event-venue') ||
                    document.querySelector('[class*="venue"]') ||
                    document.querySelector('[class*="location"]') ||
                    document.querySelector('[class*="address"]');

                if (venueBlock) {
                    const fullText = (venueBlock.textContent || '').replace(/\s+/g, ' ').trim();
                    const parts = fullText.split(/[\n\r,]+/).map((s) => s.trim()).filter(Boolean);

                    if (parts.length > 0) {
                        data.venueName = parts[0];
                        data.addressText = parts.slice(1).join(', ') || null;
                    } else {
                        data.venueName = fullText;
                        data.addressText = null;
                    }
                    data.venueText = fullText;
                }
            }

            // 3c. THÀNH PHỐ - Suy ra từ address hoặc URL
            const cities = [
                'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế',
                'Phú Quốc', 'Đà Lạt', 'Hải Phòng', 'Quảng Nam', 'Quảng Ninh'
            ];

            // Ưu tiên 1: từ URL
            const urlCityMap = {
                'hanoi': 'Hà Nội', 'ha-noi': 'Hà Nội',
                'hcm': 'Hồ Chí Minh', 'ho-chi-minh': 'Hồ Chí Minh', 'tphcm': 'Hồ Chí Minh',
                'danang': 'Đà Nẵng', 'da-nang': 'Đà Nẵng',
                'hue': 'Huế',
                'phu-quoc': 'Phú Quốc',
                'da-lat': 'Đà Lạt', 'dalat': 'Đà Lạt'
            };
            const currentUrl = window.location.href.toLowerCase();
            for (const [key, city] of Object.entries(urlCityMap)) {
                if (currentUrl.includes(key)) {
                    data.city = city;
                    break;
                }
            }

            // Ưu tiên 2: từ addressText
            if (!data.city && data.addressText) {
                for (const city of cities) {
                    if (data.addressText.includes(city)) {
                        data.city = city;
                        break;
                    }
                }
            }

            // Ưu tiên 3: từ venueText
            if (!data.city && data.venueText) {
                for (const city of cities) {
                    if (data.venueText.includes(city)) {
                        data.city = city;
                        break;
                    }
                }
            }

            // 4. MÔ TẢ - Ưu tiên [itemprop="description"]
            const descItemprop = document.querySelector('[itemprop="description"]');
            if (descItemprop && descItemprop.textContent.trim()) {
                data.description = descItemprop.textContent.trim();
            } else {
                // Fallback: meta tags
                const descSelectors = [
                    'meta[property="og:description"]',
                    'meta[name="description"]',
                    '[class*="description"]',
                    '[class*="detail"]'
                ];
                for (const selector of descSelectors) {
                    if (selector.startsWith('meta')) {
                        const meta = document.querySelector(selector);
                        if (meta && meta.content) {
                            data.description = meta.content.trim();
                            break;
                        }
                    } else {
                        const el = document.querySelector(selector);
                        if (el && el.textContent.trim()) {
                            data.description = el.textContent.trim();
                            break;
                        }
                    }
                }
            }

            // 5. GIÁ VÉ (min/max nếu có số)
            let priceEl =
                document.querySelector('[class*="price"], .ticket-price, .event-price') ||
                document.querySelector('[class*="gia"]') ||
                document.querySelector('[class*="ticket"]');
            if (priceEl) {
                const txt = priceEl.textContent.replace(/\./g, '').replace(/,/g, '').toLowerCase();
                const nums = Array.from(txt.matchAll(/\d{4,}/g))
                    .map((m) => Number(m[0]))
                    .sort((a, b) => a - b);
                if (nums.length) {
                    data.priceMin = nums[0];
                    data.priceMax = nums[nums.length - 1];
                }
            }

            return data;
        });

        // Parse và tạo event
        if (!eventData.name) {
            console.error('❌ Không tìm thấy tên sự kiện');
            return;
        }

        // Parse ngày bằng hàm helper
        let startsAt = null;
        if (eventData.startsAt) {
            startsAt = parseVietnameseDate(eventData.startsAt);
        }

        // Tạo event trong DB
        const event = await prisma.event.create({
            data: {
                name: eventData.name,
                city: eventData.city || null,
                cover: eventData.cover || null,
                startsAt: startsAt,
                description: eventData.description || null,
            }
        });

        console.log('✅ Đã import thành công!');
        console.log(`\n📋 Thông tin sự kiện:`);
        console.log(`   Tên: ${eventData.name}`);
        if (eventData.city) console.log(`   Thành phố: ${eventData.city}`);
        if (eventData.cover) console.log(`   Ảnh: ${eventData.cover.substring(0, 80)}...`);
        if (startsAt) console.log(`   Ngày: ${startsAt.toLocaleString('vi-VN')}`);
        if (eventData.venueText) console.log(`   Địa điểm: ${eventData.venueText}`);
        if (eventData.description) console.log(`   Mô tả: ${eventData.description.substring(0, 100)}...`);
        if (eventData.priceMin) {
            console.log(`   Giá: ${eventData.priceMin.toLocaleString('vi-VN')}${eventData.priceMax && eventData.priceMax !== eventData.priceMin
                ? ' - ' + eventData.priceMax.toLocaleString('vi-VN')
                : ''
                } đ`);
        }
        console.log(`\n💾 ID trong DB: ${event.id}`);
        console.log(`\n💡 Lưu ý: Event đã được tạo nhưng chưa có show.`);
        console.log(`   Sử dụng script add_shows_to_existing_events.js để thêm show và seatmap.`);

        // Lưu vào scripts/event_details.json
        try {
            const file = path.join(__dirname, 'event_details.json');
            try {
                await fs.access(file);
            } catch {
                await fs.writeFile(file, '[]', 'utf8');
            }
            const arr = JSON.parse(await fs.readFile(file, 'utf8'));
            arr.push({
                title: eventData.name,
                city: eventData.city || null,
                cover: eventData.cover || null,
                startsAt: startsAt ? startsAt.toISOString() : null,
                startsAtRaw: eventData.startsAt || null,
                venueText: eventData.venueText || null,
                venueName: eventData.venueName || null,
                addressText: eventData.addressText || null,
                priceMin: eventData.priceMin ?? null,
                priceMax: eventData.priceMax ?? null,
                description: eventData.description || null
            });
            await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8');
            console.log('📁 Đã ghi thêm vào scripts/event_details.json');
        } catch (err) {
            console.warn('⚠️  Không thể ghi vào event_details.json:', err.message);
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

// CLI usage
const urlArg = process.argv[2];
if (!urlArg) {
    console.error('❌ Vui lòng cung cấp URL sự kiện từ ticketbox.vn');
    console.log('\nCách sử dụng:');
    console.log('  node scripts/scrape_single_event.js <URL>');
    console.log('\nVí dụ:');
    console.log('  node scripts/scrape_single_event.js https://www.ticketbox.vn/event/...');
    process.exit(1);
}

scrapeSingleEvent(urlArg)
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });