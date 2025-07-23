import { createClient } from "redis";

import dotenv from 'dotenv';
dotenv.config();

export const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error', err);
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('✅ Redis connected successfully.');
    } catch (err) {
        console.error('❌ Redis connection to user service has been failed', err);
        throw err;
    }
};

export const closeRedis = async () => {
  try {
    await redisClient.quit();
    console.log('✅ Redis connection closed gracefully.');
  } catch (err) {
    console.error('❌ Failed to close Redis connection', err);
  }
};