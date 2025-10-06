import cron from "node-cron";
import Schedule from "../models/scheduleModel.js";
import DoseLog from "../models/doseLogModel.js";
import User from "../models/userModel.js";
import { sendNotification } from "../config/firebaseNotifications.js";
import nodemailer from "nodemailer";

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
          const body = `Your ${schedule.pillName} is due in 10 minutes!`;
          
          await sendNotification(user.fcmToken, title, body);

          // Send email notification
          const htmlContent = `<h3>Hi ${user.firstName || "User"},<br>Your ${schedule.pillName} is due in 10 minutes! ✨</h3>`;
          const textContent = `Hi ${user.name || "User"}, Your ${schedule.pillName} is due in 10 minutes!`;
          // console.log(htmlContent);
          // console.log(textContent);
          // console.log(user.email);

          await sendEmail(user.email, title, htmlContent, textContent);
        }
      }
    } catch (err) {
      console.error("Error in reminder cron job:", err);
    }
  });  
};