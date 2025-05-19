import { Worker } from "bullmq";
import { redis } from "../../../config/redisClient";
import sharp from "sharp";
import path from "path";


//Create a worker to process the image optimization job
const imageWorker = new Worker("imageQueue", async (job) => {
    const { filePath, fileName, width, height, quality } = job.data;

    const optimizedImagePath = path.join(__dirname, "../../../", "uploads/optimize", fileName);
        await sharp(filePath)
            .resize(width, height)
            .webp({ quality: quality })
            .toFile(optimizedImagePath);
}, { connection: redis }
)

imageWorker.on("completed", (job) => {
    console.log(`Job completed with result ${job.id}`);
});

imageWorker.on("failed", (job, err) => {
    console.log(`Job ${job?.id} failed with ${err.message}`);
})