import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 4102;
http.createServer(app).listen(PORT, () => console.log(`[events] http://localhost:${PORT}`));