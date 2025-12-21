// Script to create a ticket inspector account
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

const prisma = new PrismaClient();

async function main() {
    const email = "inspector@example.dev";
    const password = "Inspector@123";
    const fullName = "Nhân viên Kiểm soát vé";

    console.log("🚀 Creating Ticket Inspector account...\n");

    // Hash password
    const passwordHash = await bcrypt.hash(password, 8);

    // Ensure ticket_inspector role exists
    const role = await prisma.role.upsert({
        where: { name: "ticket_inspector" },
        update: {},
        create: { name: "ticket_inspector" },
    });

    // Create or update user
    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, fullName },
        create: {
            email,
            passwordHash,
            fullName,
        },
    });

    // Assign role to user
    await prisma.userRole.upsert({
        where: {
            userId_roleId: { userId: user.id, roleId: role.id }
        },
        update: {},
        create: {
            userId: user.id,
            roleId: role.id,
        },
    });

    console.log("✅ Ticket Inspector account created!\n");
    console.log("📧 Email:    " + email);
    console.log("🔑 Password: " + password);
    console.log("👤 Role:     ticket_inspector");
    console.log("\n💡 Đăng nhập và truy cập: /inspector");
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
