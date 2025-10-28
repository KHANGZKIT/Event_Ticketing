import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: tính path tới services/events/.env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
console.log('[env] REDIS_URL =', process.env.REDIS_URL || '(default: redis://localhost:6379)');
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
