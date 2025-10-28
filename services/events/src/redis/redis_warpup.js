import dotenv from "dotenv";
import Redis from "ioredis";
dotenv.config();
const url = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(url);

async function main() {
    var test = redis.ping((err, result) => {
        console.log(result);
    })

    await redis.setex('warm:demo', 10, 'hello');
    const value = await redis.get('warm:demo');
    console.log("Gia tri cua warm:demo", value);

    const ttl = await redis.ttl('warm:demo');
    console.log('Thoi luong song: ', ttl);
    const pttl = await redis.pttl('warm:demo');
    console.log('Thoi luong con lai', pttl);

    let cursor = '0';
    do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', 'warm:*', 'COUNT', 10);
        console.log('Keys:', keys);
        cursor = next;
    } while (cursor !== '0');

}