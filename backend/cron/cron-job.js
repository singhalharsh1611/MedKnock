import cron from "node-cron";
import Schedule from "../models/scheduleModel.js";
import DoseLog from "../models/doseLogModel.js";
import User from "../models/userModel.js";
import { sendNotification } from "../config/firebaseNotifications.js";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

// helper: convert "HH:mm" string to Date object for today
const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};

//helper for sending mail notification
const sendEmail = async (toEmail, subject, htmlContent, textContent) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SENDER_GMAIL,
        pass: process.env.SENDER_PASS, // Use App Password
      },
    });

    const mailOptions = {
      from: `<${process.env.SENDER_GMAIL}>`,
      to: toEmail,
      subject: subject,
      text: textContent || "",
      html: htmlContent || "",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, info };
  } catch (err) {
    console.error("Email sending failed:", err);
    return { success: false, error: err };
  }
};

// every 10 minutes check missed doses
export const startCronJobs = () => {
  cron.schedule("*/10 * * * *", async () => {
    console.log("Cron job executed at:", new Date());
    try {
      const now = new Date();
      const oneHoursAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const schedules = await Schedule.find({});
      for (const schedule of schedules) {
        for (const time of schedule.times) {
          const doseTime = getTimeForToday(time);

          // If dose time passed more than 1h ago but today no log exists them mark the pill as missed
          if (doseTime <= oneHoursAgo) {
            const existing = await DoseLog.findOne({
              scheduleId: schedule._id,
              userId: schedule.userId,
              timestamp: {
                $gte: doseTime,
                $lte: new Date(doseTime.getTime() + 1 * 60 * 60 * 1000)
              }
            });

            if (!existing) {
              await DoseLog.create({
                scheduleId: schedule._id,
                userId: schedule.userId,
                status: "missed",
                timestamp: doseTime
              });

              //increase risk if missed
              schedule.riskScore += 2;
              await schedule.save();

              console.log(`Marked missed dose for schedule ${schedule._id} at ${time}`);
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
      const schedulesToSend = await Schedule.find({
        times: timeString,
        isActive: true,
      });

      if (schedulesToSend.length === 0) {
        return; // No reminders to send right now
      }

      console.log(`[${new Date().toLocaleTimeString()}] Found ${schedulesToSend.length} schedules for reminder at ${timeString}.`);

      // 3. For each schedule, find the user and send a notification
      for (const schedule of schedulesToSend) {
        const user = await User.findById(schedule.userId);

        // Check if the user exists and has a saved fcmToken
        if (user && user.fcmToken) {
          const title = "Alchemist's Reminder ✨";
          let body = `Your ${schedule.pillName} is due in 10 minutes!`;

          // ai prediction
          if (schedule.riskScore > 10) {
            //  console.log("Ai prediction");

            try {
              // Fetch recent missed dose logs
              const missedLogs = await DoseLog.find({
                scheduleId: schedule._id,
                status: "missed",
              })
                .sort({ timestamp: -1 })
                .limit(40);

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

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

                console.log("Sending request to Gemini API...");

                const apiResponse = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                  }),
                });

                console.log("Gemini raw status:", apiResponse.status);

                if (!apiResponse.ok) {
                  body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
                } else {
                  const data = JSON.parse(responseText);
                  const pattern =
                    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                  if (pattern) {
                    body = `AI Nudge: Records show you often miss your ${pattern} dose of ${schedule.pillName}. It's due in 10 minutes!`;
                  } else {
                    body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
                  }
                }
              }
            } catch (error) {
              console.error("AI Adherence prediction failed:", error);
              body = `Proactive Nudge: You've missed your ${schedule.pillName} a few times recently. It's due in 10 minutes!`;
            }
          }


          await sendNotification(user.fcmToken, title, body);

          // Send email notification
          await sendEmail(user.email, title, `<h3>${body}</ h3>`, body);
        }
      }
    } catch (err) {
      console.error("Error in reminder cron job:", err);
    }
  });

  // Cron job to notify low medicine stock every 6 hours


};