import cron from "node-cron";
import prisma from "../config/prismaClient.js";
import { sendNotification } from "../utils/pushClient.js";
import fetch from "node-fetch";
import { callLLM } from "../utils/llmClient.js";
import { sendWhatsAppMessage } from "../utils/whatsappClient.js";
import dotenv from 'dotenv';

dotenv.config();

// helper: convert "HH:mm" string to Date object for today
const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return new Date(utc - istOffset);
  // return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};



// every 10 minutes check missed doses
export const startCronJobs = () => {
  cron.schedule("*/10 * * * *", async () => {
    console.log("Cron job executed at:", new Date());
    try {
      const now = new Date();
      const oneHoursAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const schedules = await prisma.schedule.findMany();
      for (const schedule of schedules) {
        for (const time of schedule.times) {
          const doseTime = getTimeForToday(time);

          // If dose time passed more than 1h ago but today no log exists them mark the pill as missed
          if (doseTime <= oneHoursAgo) {
            const existing = await prisma.doseLog.findFirst({
              where: {
                scheduleId: schedule.id,
                userId: schedule.userId,
                timestamp: {
                  gte: new Date(doseTime.getTime() - 1 * 60 * 60 * 1000),
                  lte: new Date(doseTime.getTime() + 1 * 60 * 60 * 1000)
                }
              }
            });

            if (!existing) {
              await prisma.doseLog.create({
                data: {
                  scheduleId: schedule.id,
                  userId: schedule.userId,
                  status: "missed",
                  timestamp: doseTime
                }
              });

              //increase risk if missed
              schedule.riskScore += 2;
              await prisma.schedule.update({
                where: { id: schedule.id },
                data: { riskScore: schedule.riskScore }
              });

              console.log(`Marked missed dose for schedule ${schedule.id} at ${time}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });

  // For Sending automatic Notifications->This cron job runs every single minute
  cron.schedule("* * * * *", async () => {
    console.log("every min cron");
    try {
      // 1. Calculate the time 10 minutes from now
      const now = new Date();
      const notificationTime = new Date(now.getTime() + 10 * 60 * 1000);
      const hours = notificationTime.getHours().toString().padStart(2, "0");
      const minutes = notificationTime.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;

      // 2. Find all active schedules that have a dose due at that specific time
      const schedulesToSend = await prisma.schedule.findMany({
        where: {
          times: { has: timeString },
          isActive: true,
        }
      });

      if (schedulesToSend.length === 0) {
        return; // No reminders to send right now
      }

      console.log(`[${new Date().toLocaleTimeString()}] Found ${schedulesToSend.length} schedules for reminder at ${timeString}.`);

      // 3. For each schedule, find the user and send a notification
      for (const schedule of schedulesToSend) {
        const user = await prisma.user.findUnique({
          where: { id: schedule.userId }
        });

        // Check if the user exists and has a saved fcmToken
        if (user && user.fcmToken) {
          const title = "Medication Reminder ✨";
          let body = `Your ${schedule.pillName} is due in 10 minutes!`;

          // ai prediction
          if (schedule.riskScore > 10) {
            //  console.log("Ai prediction");

            try {
              // Fetch recent missed dose logs
              const missedLogs = await prisma.doseLog.findMany({
                where: {
                  scheduleId: schedule.id,
                  status: "missed",
                },
                orderBy: { timestamp: 'desc' },
                take: 40
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
        Your Response:
      `;

                console.log("Sending request to LLM API...");

                try {
                  let pattern = await callLLM([{ text: prompt }]);
                  if (pattern) pattern = pattern.trim();

                  if (pattern) {
                    body = `AI Nudge: Records show you often miss your ${pattern} dose of ${schedule.pillName}. It's due in 10 minutes!`;
                  } else {
                    body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
                  }
                } catch (error) {
                  console.error("LLM API failed:", error);
                  body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
                }
              }
            } catch (error) {
              console.error("AI Adherence prediction failed:", error);
              body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
            }
          }


          await sendNotification(user.fcmToken, title, body);

(user.email, title, `<h3>${body}</ h3>`, body);

          //send whatsapp notification
          if (user.phone) {
          const toNumber = `whatsapp:+91${user.phone}`; 
          try {
            await sendWhatsAppMessage(toNumber, user.firstName, schedule.pillName, timeString);
            console.log(`WhatsApp reminder sent to ${toNumber}`);
          } catch (err) {
            console.error("WhatsApp send failed:", err.message);
          }
        }
        }
      }
    } catch (err) {
      console.error("Error in reminder cron job:", err);
    }
  });

  // Cron job to notify low medicine stock every 6 hours
cron.schedule("0 */6 * * *", async () => {
  console.log("Low stock check cron executed at:", new Date());
  try {
    // 1. Find schedules where quantity is less than 4
    const lowStockSchedules = await prisma.schedule.findMany({
      where: {
        quantity: { lt: 4 },
        isActive: true,
      }
    });

    if (lowStockSchedules.length === 0) {
      console.log("No low stock medicines found.");
      return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Found ${lowStockSchedules.length} low stock schedules.`);

    // 2. Send notification to each user
    for (const schedule of lowStockSchedules) {
      const user = await prisma.user.findUnique({
        where: { id: schedule.userId }
      });

      if (user && user.fcmToken) {
        const title = "Medicine Stock Alert ⚠️";
        const body = `Your medicine ${schedule.pillName} is running low (quantity: ${schedule.quantity}). Please refill soon.`;

        // Send push notification
        await sendNotification(user.fcmToken, title, body);

(user.email, title, `<h3>${body}</h3>`, body);

        //send whatsapp notification
        if (user.phone) {
          const toNumber = `whatsapp:+91${user.phone}`;
          try {
            await sendWhatsAppMessage(toNumber, user.firstName, schedule.pillName, timeString, body);
            console.log(`WhatsApp reminder sent to ${toNumber}`);
          } catch (err) {
            console.error("WhatsApp send failed:", err.message);
          }
        }


        console.log(`Low stock notification sent to ${user.email} for ${schedule.pillName}`);
      }
    }
  } catch (err) {
    console.error("Error in low stock cron job:", err);
  }
});

};
