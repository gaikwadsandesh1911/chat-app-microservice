import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config();
const redisClient = createClient({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error', err);
});
export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('✅ Redis connected successfully.');
    }
    catch (err) {
        console.error('❌ Redis connection failed', err);
        throw err;
    }
};
export default redisClient;
