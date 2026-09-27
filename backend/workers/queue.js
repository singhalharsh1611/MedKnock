import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const connection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

export const cronQueue = new Queue("cron-jobs", { connection });

export const setupCronJobs = async () => {
  // Use BullMQ v6 Job Schedulers instead of deprecated getRepeatableJobs
  
  // 1. Every 10 minutes: check missed doses
  await cronQueue.upsertJobScheduler(
    "missed-doses-scheduler",
    { pattern: "*/10 * * * *" },
    { name: "check-missed-doses", data: {} }
  );

  // 2. Every minute: medication reminders
  await cronQueue.upsertJobScheduler(
    "medication-reminders-scheduler",
    { pattern: "* * * * *" },
    { name: "medication-reminders", data: {} }
  );

  // 3. Every 6 hours: low stock alert
  await cronQueue.upsertJobScheduler(
    "low-stock-alert-scheduler",
    { pattern: "0 */6 * * *" },
    { name: "low-stock-alert", data: {} }
  );

  console.log("BullMQ Job Schedulers initialized successfully.");
};
