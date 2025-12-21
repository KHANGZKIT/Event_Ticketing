// Quick script to check roles in database
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.role.findMany();
    console.log("\n📋 Current roles in database:");
    console.table(roles);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
