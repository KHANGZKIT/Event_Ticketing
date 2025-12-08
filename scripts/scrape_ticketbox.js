// scripts/scrape_ticketbox.js
// Script để scrape thông tin sự kiện từ ticketbox.vn
// ⚠️ LƯU Ý: Chỉ sử dụng cho mục đích học tập và phát triển. Tuân thủ Terms of Service của ticketbox.vn

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * Scrape thông tin sự kiện từ ticketbox.vn
 * @param {string} url - URL trang sự kiện trên ticketbox.vn
 * @returns {Promise<Object>} Thông tin sự kiện
 */
async function scrapeEventInfo(url) {
    console.log(`[scrape] Đang truy cập: ${url}`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set user agent để tránh bị chặn
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Nếu có cookie đăng nhập (TICKETBOX_COOKIE), thêm vào để truy cập nội dung yêu cầu login
        if (process.env.TICKETBOX_COOKIE) {
            await page.setExtraHTTPHeaders({
                'Cookie': process.env.TICKETBOX_COOKIE,
            });
        }
        
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Đợi các element load
        await page.waitForSelector('body', { timeout: 10000 });

        // Extract thông tin sự kiện
        const eventData = await page.evaluate(() => {
            const data = {};

            // Tên sự kiện
            const nameSelectors = [
                'h1[class*="event"]',
                'h1[class*="title"]',
                '.event-title',
                'h1',
                'h2[class*="event"]'
            ];
            for (const selector of nameSelectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent.trim()) {
                    data.name = el.textContent.trim();
                    break;
                }
            }

            // Hình ảnh cover
            const imageSelectors = [
                'img[class*="cover"]',
                'img[class*="banner"]',
                'img[class*="event"]',
                '.event-cover img',
                '.event-banner img',
                'meta[property="og:image"]',
                'meta[name="twitter:image"]'
            ];
            for (const selector of imageSelectors) {
                if (selector.startsWith('meta')) {
                    const meta = document.querySelector(selector);
                    if (meta && meta.content) {
                        data.cover = meta.content;
                        break;
                    }
                } else {
                    const img = document.querySelector(selector);
                    if (img) {
                        data.cover = img.src || img.getAttribute('data-src');
                        if (data.cover && !data.cover.startsWith('data:')) {
                            break;
                        }
                    }
                }
            }

            // Địa điểm / Thành phố
            const locationSelectors = [
                '[class*="location"]',
                '[class*="venue"]',
                '[class*="city"]',
                '.event-location',
                '.event-venue'
            ];
            for (const selector of locationSelectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent.trim()) {
                    const text = el.textContent.trim();
                    // Lấy thành phố từ text (Hà Nội, Hồ Chí Minh, Đà Nẵng, etc)
                    const cities = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế', 'Quảng Nam', 'Quảng Ninh'];
                    for (const city of cities) {
                        if (text.includes(city)) {
                            data.city = city;
                            break;
                        }
                    }
                    if (!data.location) {
                        data.location = text;
                    }
                    break;
                }
            }

            // Ngày diễn ra
            const dateSelectors = [
                '[class*="date"]',
                '[class*="time"]',
                '.event-date',
                '.event-time',
                'time'
            ];
            for (const selector of dateSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    const dateText = el.textContent.trim() || el.getAttribute('datetime');
                    if (dateText) {
                        data.dateText = dateText;
                        break;
                    }
                }
            }

            // Giá vé (nếu có)
            const priceSelectors = [
                '[class*="price"]',
                '[class*="ticket"]',
                '.event-price',
                '.ticket-price'
            ];
            for (const selector of priceSelectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent.trim()) {
                    const priceText = el.textContent.trim();
                    // Extract số từ text (ví dụ: "100.000đ" -> 100000)
                    const match = priceText.match(/(\d+(?:\.\d+)*)/);
                    if (match) {
                        data.priceText = priceText;
                    }
                    break;
                }
            }

            // Mô tả
            const descSelectors = [
                '[class*="description"]',
                '[class*="detail"]',
                '.event-description',
                'meta[name="description"]',
                'meta[property="og:description"]'
            ];
            for (const selector of descSelectors) {
                if (selector.startsWith('meta')) {
                    const meta = document.querySelector(selector);
                    if (meta && meta.content) {
                        data.description = meta.content;
                        break;
                    }
                } else {
                    const el = document.querySelector(selector);
                    if (el && el.textContent.trim()) {
                        data.description = el.textContent.trim().substring(0, 500);
                        break;
                    }
                }
            }

            return data;
        });

        // Parse ngày tháng
        if (eventData.dateText) {
            try {
                // Thử parse các format ngày phổ biến
                const dateMatch = eventData.dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                    const [, day, month, year] = dateMatch;
                    eventData.startsAt = new Date(`${year}-${month}-${day}`);
                } else {
                    // Thử parse ISO date
                    const parsed = new Date(eventData.dateText);
                    if (!isNaN(parsed.getTime())) {
                        eventData.startsAt = parsed;
                    }
                }
            } catch (e) {
                console.warn('[scrape] Không thể parse ngày:', eventData.dateText);
            }
        }

        return eventData;

    } catch (error) {
        console.error('[scrape] Lỗi khi scrape:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Lấy danh sách URL sự kiện từ trang chủ ticketbox.vn
 * @param {number} maxEvents - Số lượng events tối đa
 * @returns {Promise<string[]>} Danh sách URL
 */
async function getEventUrls(maxEvents = 20) {
    console.log(`[scrape] Đang lấy danh sách sự kiện từ ticketbox.vn...`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        // Set headers để giả lập trình duyệt thật
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Nếu có cookie đăng nhập (TICKETBOX_COOKIE) thì thêm vào header để tránh bị chặn
        const extraHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };
        if (process.env.TICKETBOX_COOKIE) {
            extraHeaders['Cookie'] = process.env.TICKETBOX_COOKIE;
        }
        await page.setExtraHTTPHeaders(extraHeaders);

        const startUrl = process.env.START_URL || 'https://www.ticketbox.vn/';
        console.log(`   Đang truy cập: ${startUrl}`);
        await page.goto(startUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Đợi JS render + auto scroll để lazy-load thêm thẻ
        await new Promise((r) => setTimeout(r, 1500));
        try {
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let total = 0;
                    const step = () => {
                        const { scrollHeight } = document.documentElement;
                        window.scrollBy(0, 800);
                        total += 800;
                        if (total >= scrollHeight || total > 12000) return resolve();
                        setTimeout(step, 200);
                    };
                    step();
                });
            });
        } catch {}

        // Kiểm tra xem có bị chặn không
        const pageContent = await page.content();
        if (pageContent.includes('bot') || pageContent.includes('captcha') || pageContent.includes('login')) {
            console.warn('   ⚠️  Có thể trang web yêu cầu đăng nhập hoặc chặn bot');
        }

        console.log('   Đang tìm kiếm links sự kiện...');
        
        const urls = await page.evaluate((max) => {
            const links = new Set();

            const normalizeUrl = (url) => {
                try {
                    const u = new URL(url);
                    u.search = ''; // bỏ UTM và query rác
                    u.hash = '';
                    return u.toString();
                } catch {
                    return url;
                }
            };

            const isEventPath = (p) => {
                if (!p) return false;
                const low = p.toLowerCase();
                // Chấp nhận:
                //  - /event/... hoặc /su-kien/...
                //  - slug kết thúc bằng -<id> hoặc .html
                const slugId = /\/[a-z0-9\-]+-\d+(?:\.html)?$/i.test(low);
                const hasKnownPrefix = (low.includes('/event/') || low.includes('/su-kien/'));
                if (!(slugId || hasKnownPrefix)) return false;
                // Loại trừ các trang policy/terms/organizer/etc
                const bad = ['terms', 'policy', 'privacy', 'regulations', 'organizer', 'customer', 'login', 'register'];
                return !bad.some(b => low.includes(b));
            };

            // Ưu tiên: chọn các thẻ event card phổ biến trước
            const selectors = [
                'a[href*="/event/"]',
                'a[href*="/su-kien/"]',
            ];
            for (const sel of selectors) {
                document.querySelectorAll(sel).forEach(a => {
                    const href = a.getAttribute('href');
                    if (!href) return;
                    let url = href;
                    if (!href.startsWith('http')) {
                        url = href.startsWith('/') ? `https://www.ticketbox.vn${href}` : `https://www.ticketbox.vn/${href}`;
                    }
                    try {
                        const u = new URL(url);
                        if (u.hostname.includes('ticketbox.vn') && isEventPath(u.pathname)) {
                            links.add(normalizeUrl(u.toString()));
                        }
                    } catch {}
                });
            }

            // Fallback: quét tất cả <a> nếu chưa đủ
            if (links.size < max) {
                document.querySelectorAll('a[href]').forEach(a => {
                    const href = a.getAttribute('href');
                    if (!href) return;
                    let url = href;
                    if (!href.startsWith('http')) {
                        url = href.startsWith('/') ? `https://www.ticketbox.vn${href}` : `https://www.ticketbox.vn/${href}`;
                    }
                    try {
                        const u = new URL(url);
                        if (!u.hostname.includes('ticketbox.vn')) return;
                        if (isEventPath(u.pathname)) {
                            links.add(normalizeUrl(u.toString()));
                        }
                    } catch {}
                });
            }

            // Nếu không tìm thấy, thử tìm trong các element có class liên quan đến event
            if (links.size === 0) {
                const eventElements = document.querySelectorAll('[class*="event"], [class*="Event"], [id*="event"], [id*="Event"]');
                for (const el of eventElements) {
                    const link = el.closest('a') || el.querySelector('a');
                    if (link) {
                        const href = link.getAttribute('href');
                        if (href) {
                            const fullUrl = href.startsWith('http')
                                ? href
                                : `https://www.ticketbox.vn${href.startsWith('/') ? href : '/' + href}`;
                            try {
                                const u = new URL(fullUrl);
                                if (u.hostname.includes('ticketbox.vn') && isEventPath(u.pathname)) {
                                    links.add(normalizeUrl(u.toString()));
                                }
                            } catch {}
                        }
                    }
                }
            }

            return Array.from(links).slice(0, max);
        }, maxEvents);

        return urls;

    } catch (error) {
        console.error('[scrape] Lỗi khi lấy danh sách:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Import events vào database
 */
async function importEventsFromTicketbox(maxEvents = 10) {
    console.log('🚀 Bắt đầu scrape events từ ticketbox.vn...');
    console.log('⚠️  Lưu ý: Chỉ sử dụng cho mục đích phát triển. Tuân thủ Terms of Service.\n');

    try {
        // Lấy danh sách URL events
        const urls = await getEventUrls(maxEvents);
        console.log(`✓ Tìm thấy ${urls.length} events\n`);

        const importedEvents = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`[${i + 1}/${urls.length}] Đang scrape: ${url}`);

            try {
                const eventData = await scrapeEventInfo(url);

                if (!eventData.name) {
                    console.warn('  ⚠️  Không tìm thấy tên sự kiện, bỏ qua');
                    continue;
                }

                // Tạo event trong DB
                const event = await prisma.event.create({
                    data: {
                        name: eventData.name,
                        city: eventData.city || null,
                        cover: eventData.cover || null,
                        startsAt: eventData.startsAt || null,
                    },
                });

                console.log(`  ✓ Đã import: ${eventData.name}`);
                if (eventData.cover) {
                    console.log(`    📷 Cover: ${eventData.cover.substring(0, 80)}...`);
                }
                if (eventData.city) {
                    console.log(`    📍 Thành phố: ${eventData.city}`);
                }

                importedEvents.push(event);

                // Delay để tránh bị rate limit
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (err) {
                console.error(`  ❌ Lỗi: ${err.message}`);
                continue;
            }
        }

        console.log(`\n✅ Hoàn thành! Đã import ${importedEvents.length} events.`);
        return importedEvents;

    } catch (error) {
        console.error('❌ Lỗi:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// CLI usage
const maxEvents = process.argv[2] ? parseInt(process.argv[2]) : 10;
importEventsFromTicketbox(maxEvents)
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
