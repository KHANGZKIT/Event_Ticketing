// scripts/scrape_from_url_file.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Mặc định đọc file url.txt nằm cùng folder scripts/
const fileArg = process.argv[2] || 'url.txt';
const urlFile = path.isAbsolute(fileArg)
    ? fileArg
    : path.resolve(__dirname, fileArg);

async function run() {
    try {
        const raw = await fs.readFile(urlFile, 'utf8');
        const urls = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (!urls.length) {
            console.error(`[scrape:list] File ${urlFile} không có URL nào.`);
            process.exit(1);
        }

        console.log(`[scrape:list] Bắt đầu import ${urls.length} URL từ ${urlFile}\n`);

        const succeeded = [];
        const failed = [];

        const runOne = (url) =>
            new Promise((resolve, reject) => {
                const child = spawn('node', ['scripts/scrape_single_event.js', url], {
                    stdio: 'inherit',
                    env: process.env,
                });
                child.on('close', (code) => {
                    if (code === 0) return resolve();
                    reject(new Error(`scrape_single_event exited with code ${code}`));
                });
            });

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`\n[${i + 1}/${urls.length}] ${url}`);
            try {
                await runOne(url);
                succeeded.push(url);
            } catch (err) {
                console.error(`[scrape:list] ❌ Lỗi với ${url}: ${err.message}`);
                failed.push(url);
            }
        }

        console.log(
            `\n[scrape:list] Hoàn thành. Thành công: ${succeeded.length}. Thất bại: ${failed.length}.`,
        );
        if (failed.length) {
            console.log('Các URL thất bại:');
            failed.forEach((u) => console.log(` - ${u}`));
            process.exitCode = 1;
        }
    } catch (err) {
        console.error('[scrape:list] Lỗi:', err.message);
        process.exit(1);
    }
}

run();
