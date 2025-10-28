import { ensureRedis, getRedis } from '../redis/client.js';

await ensureRedis();
const r = getRedis();

// 1) Set một key “Node → CLI”
await r.setex('probe:from_node', 120, 'hello-from-node');

// 2) Đọc DB index & keyspace
const info = await r.info('keyspace'); // gợi ý: in Keyspace
const dbIndex = r.options?.db ?? 0;     // ioredis db option (mặc định 0)
console.log('[probe] node db =', dbIndex);
console.log('[probe] keyspace =\n' + info);

// 3) Thử đọc key do CLI sẽ set (sau khi bạn set ở bước Run & Verify)
const val = await r.get('probe:from_cli');
console.log('[probe] get probe:from_cli =', val ?? '(nil)');

process.exit(0);
