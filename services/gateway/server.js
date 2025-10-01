import express from 'express';
import config from './src/config/config.js';
import { requestID } from './src/middlewares/requestID.js';

const app = express();
app.use(express.json());
app.use(requestID);

// Sample route
app.get('/health', (req, res) => {
    res.send('OK');
})

app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
})
