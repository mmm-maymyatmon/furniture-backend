import { Redis } from "ioredis";

export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT!) || 6379,
    // port: parseInt(process.env.REDIS_PORT!),
    maxRetriesPerRequest: null, //for bullMQ
    // password: process.env.REDIS_PASSWORD
})