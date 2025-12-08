import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@app/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ID = "SM_DEMO_1";
// 👉 Portable path: scripts/..../packages/db/seatmaps/SM_DEMO_1.json
const file = path.resolve(__dirname, "..", "packages", "db", "seatmaps", `${ID}.json`);

console.log("[seed] seatmap file =", file);

// Nếu file chưa có, tạo nhanh với template demo
if (!existsSync(file)) {
    const demo = {
        id: ID,
        name: "Demo 2x10",
        rows: [{ name: "A", count: 10 }, { name: "B", count: 10 }]
    };
    await fs.writeFile(file, JSON.stringify(demo, null, 2), "utf-8");
    console.log("✔ wrote demo seatmap:", file);
}

const tpl = JSON.parse(await fs.readFile(file, "utf-8"));

// upsert SeatMap (nhớ có name)
await prisma.seatMap.upsert({
    where: { id: ID },
    update: { name: "Demo 2x10", schema: tpl },
    create: { id: ID, name: "Demo 2x10", schema: tpl },
});

// link S1
await prisma.show.update({
    where: { id: "S1" },
    data: { seatMapDbId: ID, seatMapId: ID }, // giữ alias file làm fallback
});

console.log("✔ SeatMap seeded & S1 linked to", ID);
process.exit(0);
