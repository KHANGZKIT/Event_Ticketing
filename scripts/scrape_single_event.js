// scripts/scrape_single_event.js
// Script để scrape một sự kiện cụ thể từ URL ticketbox.vn

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * Scrape thông tin một sự kiện từ URL
 */
async function scrapeSingleEvent(url) {
    if (!url || !url.includes('ticketbox.vn')) {
        console.error('❌ URL không hợp lệ. Phải là URL từ ticketbox.vn');
        process.exit(1);
    }

    console.log(`🚀 Đang scrape: ${url}\n`);

    const browser = await puppeteer.launch({
        headless: false, // Hiển thị browser để debug
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        });
        
        // Ẩn các dấu hiệu automation
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        
        console.log('⏳ Đang tải trang...');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Đợi JavaScript load
        await page.waitForTimeout(3000);
        
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

            // 1. Tên sự kiện
            const nameSelectors = [
                'h1',
                'h2',
                '[class*="event-title"]',
                '[class*="title"]',
                'meta[property="og:title"]'
            ];
            for (const selector of nameSelectors) {
                if (selector.startsWith('meta')) {
                    const meta = document.querySelector(selector);
                    if (meta && meta.content) {
                        data.name = meta.content.trim();
                        break;
                    }
                } else {
                    const el = document.querySelector(selector);
                    if (el && el.textContent.trim()) {
                        data.name = el.textContent.trim();
                        break;
                    }
                }
            }

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

            // 3. Thành phố
            const cities = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế', 'Quảng Nam', 'Quảng Ninh', 'Hải Phòng'];
            const bodyText = document.body.textContent || '';
            for (const city of cities) {
                if (bodyText.includes(city)) {
                    data.city = city;
                    break;
                }
            }

            // 4. Ngày tháng
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
                        break;
                    }
                } else {
                    const el = document.querySelector(selector);
                    if (el) {
                        const dateStr = el.getAttribute('datetime') || el.textContent.trim();
                        if (dateStr) {
                            data.startsAt = dateStr;
                            break;
                        }
                    }
                }
            }

            // 5. Mô tả
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
                        data.description = el.textContent.trim().substring(0, 500);
                        break;
                    }
                }
            }

            return data;
        });

        // Parse và tạo event
        if (!eventData.name) {
            console.error('❌ Không tìm thấy tên sự kiện');
            return;
        }

        // Parse ngày
        let startsAt = null;
        if (eventData.startsAt) {
            try {
                startsAt = new Date(eventData.startsAt);
                if (isNaN(startsAt.getTime())) {
                    // Thử parse format DD/MM/YYYY
                    const match = eventData.startsAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (match) {
                        const [, day, month, year] = match;
                        startsAt = new Date(`${year}-${month}-${day}`);
                    }
                }
            } catch (e) {
                console.warn('⚠️  Không thể parse ngày:', eventData.startsAt);
            }
        }

        // Tạo event trong DB
        const event = await prisma.event.create({
            data: {
                name: eventData.name,
                city: eventData.city || null,
                cover: eventData.cover || null,
                startsAt: startsAt,
            },
        });

        console.log('✅ Đã import thành công!');
        console.log(`\n📋 Thông tin sự kiện:`);
        console.log(`   Tên: ${eventData.name}`);
        if (eventData.city) console.log(`   Thành phố: ${eventData.city}`);
        if (eventData.cover) console.log(`   Ảnh: ${eventData.cover.substring(0, 80)}...`);
        if (startsAt) console.log(`   Ngày: ${startsAt.toLocaleDateString('vi-VN')}`);
        console.log(`\n💾 ID trong DB: ${event.id}`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    } finally {
        await browser.close();
        await prisma.$disconnect();
    }
}

// CLI usage
const url = process.argv[2];
if (!url) {
    console.error('❌ Vui lòng cung cấp URL sự kiện từ ticketbox.vn');
    console.log('\nCách sử dụng:');
    console.log('  node scripts/scrape_single_event.js <URL>');
    console.log('\nVí dụ:');
    console.log('  node scripts/scrape_single_event.js https://www.ticketbox.vn/event/...');
    process.exit(1);
}

scrapeSingleEvent(url)
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
