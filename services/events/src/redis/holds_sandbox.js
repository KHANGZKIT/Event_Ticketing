import { createHoldAtomic } from '../modules/holds/hold.redis.js';
import { ensureRedis } from '../redis/client.js';


// argv: showId seatsCSV userId ttlSec?
const showId = process.argv[2] || 'S1';
const seats = (process.argv[3] || 'A1,A2').split(',');
const userId = process.argv[4] || 'U1';
const ttlSec = Number(process.argv[5] || 15);

await ensureRedis(); // ép kết nối một lần

const res = await createHoldAtomic({ userId, showId, seatIds: seats, ttlSec }); // TODO: đảm bảo hàm đã return
console.log(JSON.stringify(res, null, 2));
process.exit(0);
