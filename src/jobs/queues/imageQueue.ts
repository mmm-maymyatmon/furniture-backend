import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis({
    host: process.env.REDIS_HOST,
    port: 6379,
    // port: parseInt(process.env.REDIS_PORT!),
    // password: process.env.REDIS_PASSWORD
})

const ImageQueue = new Queue("imageQueue", { connection });
export default ImageQueue;