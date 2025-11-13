import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ensureRedis } from "./redis/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 4102;

// Đảm bảo Redis được kết nối trước khi start server
async function startServer() {
    try {
        await ensureRedis();
        console.log('[server] Redis connected successfully');
        
        http.createServer(app).listen(PORT, () => {
            console.log(`[events] http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('[server] Failed to connect to Redis:', err.message);
        console.error('[server] Please ensure Redis is running: docker-compose up -d redis');
        process.exit(1);
    }
}

startServer();