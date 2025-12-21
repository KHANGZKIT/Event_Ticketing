// packages/db/prisma/seed_roles.js
// Script to seed all roles including new ones for Use Case Diagram alignment
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

const prisma = new PrismaClient();

const ROLES = [
    { name: "user", description: "Regular customer" },
    { name: "staff", description: "General staff member" },
    { name: "admin", description: "System administrator" },
    { name: "ticket_inspector", description: "Staff who checks-in tickets at venue" },
    { name: "event_manager", description: "Staff who manages events and seatmaps" },
];

async function main() {
    console.log("🚀 Seeding roles...\n");

    for (const role of ROLES) {
        const result = await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: { name: role.name },
        });
        console.log(`   ✓ Role "${role.name}" (id: ${result.id}) - ${role.description}`);
    }

    console.log("\n✅ All roles seeded successfully!");
    console.log("\n📋 Role hierarchy:");
    console.log("   user             → Customer (đặt vé, thanh toán)");
    console.log("   ticket_inspector → Check-in vé tại cửa");
    console.log("   event_manager    → Quản lý sự kiện, seatmap");
    console.log("   staff            → Nhân viên chung");
    console.log("   admin            → Quản trị toàn hệ thống");
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
