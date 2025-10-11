import dotenv from 'dotenv';
import http from 'http';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4101;

http.createServer(app).listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});