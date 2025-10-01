import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: Number(process.env.PORT)
};

export default config;
