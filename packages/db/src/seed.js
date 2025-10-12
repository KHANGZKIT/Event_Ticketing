// packages/db/prisma/seed.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedRoles() {
    const roles = ['admin', 'staff', 'user']; // hoặc 'customer'
    for (const name of roles) {
        await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    console.log('✓ Seed roles:', roles.join(', '));
}

async function ensureAdminUser() {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const pass = process.env.ADMIN_PASSWORD || 'Admin123';
    if (!email) { console.warn('⚠️ADMIN_EMAIL not set → skip admin user'); return; }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const passwordHash = await bcrypt.hash(pass, 10);
        user = await prisma.user.create({
            data: { email, passwordHash, fullName: 'System Admin' }
        });
        console.log(`✓ Created admin user: ${email} (temp password: ${pass})`);
    } else {
        console.log(`↷ Admin user already exists: ${email}`);
    }

    const adminRole = await prisma.role.findUnique({
        where: { name: 'admin' }
    });
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
        update: {},
        create: { userId: user.id, roleId: adminRole.id },
    });
    console.log(`✓ Granted 'admin' to ${email}`);
}

async function seedSampleData() {
    const e = await prisma.event.upsert({
        where: { id: 'seed-e1' },
        update: {},
        create: { id: 'seed-e1', name: 'Concert A', city: 'HN', startsAt: new Date('2025-10-10T19:00:00Z') },
    });
    await prisma.show.upsert({
        where: { id: 'seed-s1' },
        update: {},
        create: { id: 'seed-s1', eventId: e.id, startsAt: new Date('2025-10-10T19:00:00Z'), venue: 'Mỹ Đình', seatMapId: 'm1' },
    });
    await prisma.show.upsert({
        where: { id: 'seed-s2' },
        update: {},
        create: { id: 'seed-s2', eventId: e.id, startsAt: new Date('2025-10-10T21:00:00Z'), venue: 'Mỹ Đình', seatMapId: 'm1' },
    });
    console.log('✓ Seeded events/shows (seed-e1, seed-s1, seed-s2)');
}

async function main() {
    await seedRoles();
    await ensureAdminUser();    // <<-- thay cho grantAdminByEmail
    await seedSampleData();
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        return prisma.$disconnect().finally(() => process.exit(1));
    });
