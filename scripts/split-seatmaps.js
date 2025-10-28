import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

//Lay dir name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const packPath = path.resolve(__dirname, "../packages/db/seatmaps/seatmaps_pack.json");
    const outDir = path.resolve(__dirname, "../packages/db/seatmaps");

    //Doc file pack
    const raw = await fs.readFile(packPath, "utf-8");
    const arr = JSON.parse(raw);

    //Validate
    if (!Array.isArray(arr)) {
        console.error("Seatmap khong co dang mang");
        process.exit(1);
    }

    // Tao phan tu out
    await fs.mkdir(outDir, { recursive: true });
    //Ghi tung map thanh file <id>.json
    let count = 0;
    await Promise.all(arr.map(async (m, idx) => {
        if (!m || !m.id) {
            console.warn("Thieu id");
            return
        }

        const file = path.join(outDir, `${m.id}.json`);
        await fs.writeFile(file, JSON.stringify(m, null, 2), "utf-8");
        console.log("Wrote", file);
        count++;
    }));

    console.log("Done");
}

main().catch(e => {
    console.log("Loi:", e?.message || e);
    process.exit(1);
})