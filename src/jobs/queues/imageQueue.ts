import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { redis } from "../../../config/redisClient";

const ImageQueue = new Queue("imageQueue", { connection: redis });
export default ImageQueue;