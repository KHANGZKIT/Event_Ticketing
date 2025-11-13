// scripts/append_event_details.js
// Hỗ trợ thêm nhanh một record event vào scripts/event_details.json
import fs from 'node:fs/promises';

const [,, name, city, cover, startsAt] = process.argv;
if (!name) {
  console.error('Usage: node scripts/append_event_details.js "<name>" "[city]" "[cover]" "[startsAt]"');
  process.exit(1);
}

const file = 'scripts/event_details.json';
try {
  await fs.access(file);
} catch {
  await fs.writeFile(file, '[]', 'utf8');
}
const arr = JSON.parse(await fs.readFile(file, 'utf8'));
arr.push({ title: name, city: city || null, cover: cover || null, startsAt: startsAt || null });
await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8');
console.log('✓ appended to scripts/event_details.json');


