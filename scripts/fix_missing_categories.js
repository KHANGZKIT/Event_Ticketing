/**
 * Backfill category for events that are missing it.
 * - If category is NULL/empty -> set to 'other'
 * Run: node scripts/fix_missing_categories.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', 'packages', 'db', 'prisma', '.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: [{ category: null }, { category: '' }],
      },
      select: { id: true, name: true, category: true },
    });

    if (items.length === 0) {
      console.log('✓ No events missing category');
      return;
    }

    console.log(`📋 Found ${items.length} events missing category. Updating to 'other'...`);
    const updates = items.map((e) =>
      prisma.event.update({
        where: { id: e.id },
        data: { category: 'other' },
      })
    );
    await prisma.$transaction(updates, { timeout: 60000 });
    console.log(`✓ Updated ${items.length} events`);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


