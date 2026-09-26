import { Worker } from "bullmq";
import Redis from "ioredis";
import prisma from "../config/prismaClient.js";
import { sendNotification } from "../utils/pushClient.js";
import { callLLM } from "../utils/llmClient.js";
import { sendWhatsAppMessage } from "../utils/whatsappClient.js";
import { sendEmail } from "../utils/emailClient.js";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = process.env.REDIS_URL || { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
const connection = new Redis(redisConfig);

const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return new Date(utc - istOffset);
};

async function checkMissedDoses() {
  const now = new Date();
  const oneHoursAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  const schedules = await prisma.schedule.findMany();
  for (const schedule of schedules) {
    for (const time of schedule.times) {
      const doseTime = getTimeForToday(time);

      if (doseTime <= oneHoursAgo) {
        const existing = await prisma.doseLog.findFirst({
          where: {
            scheduleId: schedule.id,
            userId: schedule.userId,
            timestamp: {
              gte: new Date(doseTime.getTime() - 1 * 60 * 60 * 1000),
              lte: new Date(doseTime.getTime() + 1 * 60 * 60 * 1000),
            },
          },
        });

        if (!existing) {
          await prisma.doseLog.create({
            data: {
              scheduleId: schedule.id,
              userId: schedule.userId,
              status: "missed",
              timestamp: doseTime,
            },
          });

          schedule.riskScore += 2;
          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { riskScore: schedule.riskScore },
          });

          console.log(`[Worker] Marked missed dose for schedule ${schedule.id} at ${time}`);
        }
      }
    }
  }
}

async function sendMedicationReminders() {
  const now = new Date();
  const notificationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const hours = notificationTime.getHours().toString().padStart(2, "0");
  const minutes = notificationTime.getMinutes().toString().padStart(2, "0");
  const timeString = `${hours}:${minutes}`;

  const schedulesToSend = await prisma.schedule.findMany({
    where: { times: { has: timeString }, isActive: true },
  });

  if (schedulesToSend.length === 0) return;

  for (const schedule of schedulesToSend) {
    const user = await prisma.user.findUnique({ where: { id: schedule.userId } });

    if (user && user.fcmToken) {
      const title = "Medication Reminder ✨";
      let body = `Your ${schedule.pillName} is due in 10 minutes!`;

      if (schedule.riskScore > 10) {
        try {
          const missedLogs = await prisma.doseLog.findMany({
            where: { scheduleId: schedule.id, status: "missed" },
            orderBy: { timestamp: "desc" },
            take: 40,
          });

          if (missedLogs.length > 0) {
            const timestamps = missedLogs.map((log) => log.timestamp);
            const prompt = `
Your task is to analyze a list of timestamps and determine the most frequent time of day a dose was missed.
You MUST reply with ONLY ONE of the following category names:
Morning (before 12 PM), Afternoon (12 PM to 5 PM), Evening (5 PM to 9 PM), or Night (after 9 PM).
Do not add any other words or punctuation.

---
Input Timestamps: ${JSON.stringify(timestamps)}
Your Response:`;

            let pattern = await callLLM([{ text: prompt }]);
            if (pattern) pattern = pattern.trim();
            if (pattern) {
              body = `AI Nudge: Records show you often miss your ${pattern} dose of ${schedule.pillName}. It's due in 10 minutes!`;
            } else {
              body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
            }
          }
        } catch (error) {
          console.error("[Worker] AI Adherence prediction failed:", error);
        }
      }

      await sendNotification(user.fcmToken, title, body);
      await sendEmail(user.email, title, `<h3>${body}</h3>`, body);

      if (user.phone) {
        const toNumber = `whatsapp:+91${user.phone}`;
        try {
          await sendWhatsAppMessage(toNumber, user.firstName, schedule.pillName, timeString);
        } catch (err) {
          console.error("[Worker] WhatsApp send failed:", err.message);
        }
      }
    }
  }
}

async function sendLowStockAlerts() {
  const lowStockSchedules = await prisma.schedule.findMany({
    where: { quantity: { lt: 4 }, isActive: true },
  });

  if (lowStockSchedules.length === 0) return;

  for (const schedule of lowStockSchedules) {
    const user = await prisma.user.findUnique({ where: { id: schedule.userId } });

    if (user && user.fcmToken) {
      const title = "Medicine Stock Alert ⚠️";
      const body = `Your medicine ${schedule.pillName} is running low (quantity: ${schedule.quantity}). Please refill soon.`;

      await sendNotification(user.fcmToken, title, body);
      await sendEmail(user.email, title, `<h3>${body}</h3>`, body);

      if (user.phone) {
        const toNumber = `whatsapp:+91${user.phone}`;
        try {
          await sendWhatsAppMessage(toNumber, user.firstName, schedule.pillName, "N/A", body);
        } catch (err) {
          console.error("[Worker] WhatsApp send failed:", err.message);
        }
      }
      console.log(`[Worker] Low stock notification sent to ${user.email} for ${schedule.pillName}`);
    }
  }
}

export const cronWorker = new Worker(
  "cron-jobs",
  async (job) => {
    switch (job.name) {
      case "check-missed-doses":
        await checkMissedDoses();
        break;
      case "medication-reminders":
        await sendMedicationReminders();
        break;
      case "low-stock-alert":
        await sendLowStockAlerts();
        break;
      default:
        console.warn("[Worker] Unknown job:", job.name);
    }
  },
  { connection }
);

cronWorker.on("completed", (job) => console.log(`[Worker] Job ${job.name} completed`));
cronWorker.on("failed", (job, err) => console.error(`[Worker] Job ${job.name} failed:`, err));

console.log("BullMQ cron worker is ready.");
