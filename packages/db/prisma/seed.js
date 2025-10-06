// prisma/seed.js
import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient();

async function seedRoles() {
    const roles = ['admin', 'staff', 'student'];
    for (const name of roles) {
        await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('✓ Seed roles');
}

async function main() {
    await seedRoles();
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        return prisma.$disconnect().finally(() => process.exit(1));
    });
