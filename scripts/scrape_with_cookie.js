// scripts/scrape_with_cookie.js
// Script để scrape với cookie đã đăng nhập (nếu ticketbox yêu cầu)

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * Scrape với cookie đã lưu
 */
async function scrapeWithCookie(url, cookies = []) {
    console.log(`🚀 Đang scrape với cookie: ${url}\n`);

    const browser = await puppeteer.launch({
        headless: false, // Hiển thị để bạn có thể đăng nhập thủ công nếu cần
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Thêm cookies nếu có
        if (cookies.length > 0) {
            await page.setCookie(...cookies);
        }

        console.log('⏳ Đang tải trang...');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(3000);

        // Nếu cần đăng nhập, mở browser và đăng nhập thủ công
        const currentUrl = page.url();
        if (currentUrl.includes('login')) {
            console.log('\n⚠️  Trang yêu cầu đăng nhập!');
            console.log('📝 Vui lòng đăng nhập trên trình duyệt đã mở...');
            console.log('⏳ Đợi 30 giây để bạn đăng nhập...');
            await page.waitForTimeout(30000);
            
            // Sau khi đăng nhập, lưu cookies
            const savedCookies = await page.cookies();
            console.log('\n💾 Cookies sau khi đăng nhập:');
            console.log(JSON.stringify(savedCookies, null, 2));
        }

        // Extract dữ liệu
        console.log('\n📊 Đang trích xuất dữ liệu...\n');

        const eventData = await page.evaluate(() => {
            const data = {};

            // Tên sự kiện
            const nameSelectors = [
                'h1',
                'h2',
                'meta[property="og:title"]',
                '[class*="event-title"]',
                '[class*="title"]'
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

            // Hình ảnh
            const imageSelectors = [
                'meta[property="og:image"]',
                'meta[name="twitter:image"]',
                'img[src*="tkbcdn.com"]',
                'img[src*="ticketbox"]',
                'img[class*="cover"]',
                'img[class*="banner"]'
            ];
            for (const selector of imageSelectors) {
                if (selector.startsWith('meta')) {
                    const meta = document.querySelector(selector);
                    if (meta && meta.content) {
                        data.cover = meta.content;
                        break;
                    }
                } else {
                    const imgs = document.querySelectorAll(selector);
                    for (const img of imgs) {
                        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                        if (src && (src.includes('tkbcdn.com') || src.includes('ticketbox'))) {
                            data.cover = src;
                            break;
                        }
                    }
                    if (data.cover) break;
                }
            }

            // Thành phố
            const cities = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế', 'Quảng Nam', 'Quảng Ninh', 'Hải Phòng'];
            const bodyText = document.body.textContent || '';
            for (const city of cities) {
                if (bodyText.includes(city)) {
                    data.city = city;
                    break;
                }
            }

            // Ngày
            const timeEl = document.querySelector('time[datetime]');
            if (timeEl) {
                data.startsAt = timeEl.getAttribute('datetime');
            }

            return data;
        });

        if (!eventData.name) {
            console.error('❌ Không tìm thấy tên sự kiện');
            console.log('\n🔍 Đang chụp màn hình để debug...');
            await page.screenshot({ path: 'debug-screenshot.png' });
            console.log('✅ Đã lưu vào debug-screenshot.png');
            return;
        }

        // Parse ngày
        let startsAt = null;
        if (eventData.startsAt) {
            startsAt = new Date(eventData.startsAt);
            if (isNaN(startsAt.getTime())) {
                startsAt = null;
            }
        }

        // Tạo event
        const event = await prisma.event.create({
            data: {
                name: eventData.name,
                city: eventData.city || null,
                cover: eventData.cover || null,
                startsAt: startsAt,
            },
        });

        console.log('✅ Đã import thành công!');
        console.log(`\n📋 Thông tin:`);
        console.log(`   Tên: ${eventData.name}`);
        if (eventData.city) console.log(`   Thành phố: ${eventData.city}`);
        if (eventData.cover) console.log(`   Ảnh: ${eventData.cover.substring(0, 80)}...`);
        console.log(`\n💾 ID: ${event.id}`);

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    } finally {
        console.log('\n⚠️  Nhấn Enter để đóng trình duyệt...');
        // await browser.close(); // Comment để giữ browser mở
        await prisma.$disconnect();
    }
}

const url = process.argv[2];
if (!url) {
    console.error('❌ Vui lòng cung cấp URL');
    console.log('\nCách sử dụng:');
    console.log('  node scripts/scrape_with_cookie.js <URL>');
    process.exit(1);
}

scrapeWithCookie(url)
    .then(() => {
        console.log('\n✅ Hoàn thành!');
        process.exit(0);
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
