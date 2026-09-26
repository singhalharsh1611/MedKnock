import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = process.env.REDIS_URL || { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
const connection = new Redis(redisConfig);

export const cronQueue = new Queue("cron-jobs", { connection });

export const setupCronJobs = async () => {
  // Clear any existing repeatable jobs to avoid duplicates if schedule changes
  const repeatableJobs = await cronQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await cronQueue.removeRepeatableByKey(job.key);
  }

  // 1. Every 10 minutes: check missed doses
  await cronQueue.add("check-missed-doses", {}, { repeat: { pattern: "*/10 * * * *" } });

  // 2. Every minute: medication reminders
  await cronQueue.add("medication-reminders", {}, { repeat: { pattern: "* * * * *" } });

  // 3. Every 6 hours: low stock alert
  await cronQueue.add("low-stock-alert", {}, { repeat: { pattern: "0 */6 * * *" } });

  console.log("BullMQ repeatable cron jobs initialized.");
};
