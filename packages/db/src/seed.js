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
    const e = await prisma.event.upsert({
        where: { id: 'seed-e1' },
        update: {},
        create: { id: 'seed-e1', name: 'Concert A', city: 'HN', startsAt: new Date('2025-10-10T19:00:00Z') }
    });
    await prisma.show.upsert({
        where: { id: 'seed-s1' },
        update: {},
        create: { id: 'seed-s1', eventId: e.id, startsAt: new Date('2025-10-10T19:00:00Z'), venue: 'Mỹ Đình', seatMapId: 'm1' }
    });
    await prisma.show.upsert({
        where: { id: 'seed-s2' },
        update: {},
        create: { id: 'seed-s2', eventId: e.id, startsAt: new Date('2025-10-10T21:00:00Z'), venue: 'Mỹ Đình', seatMapId: 'm1' }
    });
    console.log('Seeded events/shows');
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        return prisma.$disconnect().finally(() => process.exit(1));
    });
