import prisma from "../config/prismaClient.js";
import { google } from "googleapis";
import crypto from "crypto";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const getScheduleHash = (schedule) => {
  const key = `${schedule.pillName}|${schedule.times.join(",")}|${schedule.startDate}|${schedule.quantity}|${schedule.riskScore}`;
  return crypto.createHash("md5").update(key).digest("hex");
};

async function insertWithRetry(calendar, event, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await calendar.events.insert(event);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.warn("Rate limit hit, retrying...");
        await sleep(1000 * (i + 1));
      } else {
        throw err;
      }
    }
  }
}

export class GoogleCalendarService {
  static async deleteGoogleEventsForSchedule(user, schedule) {
    if (!schedule.googleEventIds?.length || !user.googleCalendarToken) return;

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({
      access_token: user.googleCalendarToken,
      refresh_token: user.googleRefreshToken,
    });
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    for (const eventId of schedule.googleEventIds) {
      try {
        await calendar.events.delete({ calendarId: "primary", eventId });
        await sleep(150);
      } catch (err) {
        console.warn(`Failed to delete event ${eventId}:`, err.message);
      }
    }

    schedule.googleEventIds = [];
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { googleEventIds: [] },
    });
  }

  static async syncDosesToGoogleCalendar(user) {
    const userId = user.id;
    if (!user.googleCalendarToken || !user.googleRefreshToken) return;

    const schedules = await prisma.schedule.findMany({
      where: { userId, isActive: true },
    });
    if (!schedules.length) return;

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({
      access_token: user.googleCalendarToken,
      refresh_token: user.googleRefreshToken,
    });
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    for (const schedule of schedules) {
      const currentHash = getScheduleHash(schedule);
      if (schedule.lastSyncedHash === currentHash) continue;

      if (schedule.googleEventIds?.length) {
        await this.deleteGoogleEventsForSchedule(user, schedule);
      }

      const dosesPerDay = schedule.times.length;
      if (!dosesPerDay || schedule.quantity <= 0) continue;

      let baseDate = new Date(schedule.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (baseDate < today) baseDate = today;

      const daysToSync = Math.ceil(schedule.quantity / dosesPerDay);
      const newEventIds = [];

      for (let i = 0; i < daysToSync; i++) {
        const eventDate = new Date(baseDate);
        eventDate.setDate(baseDate.getDate() + i);

        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, "0");
        const date = String(eventDate.getDate()).padStart(2, "0");

        const eventPromises = [];
        for (let j = 0; j < dosesPerDay; j++) {
          if (i * dosesPerDay + j >= schedule.quantity) break;

          const [hour, minute] = schedule.times[j].split(":").map(Number);
          const eventDateTime = `${year}-${month}-${date}T${String(hour).padStart(2, "0")}:${String(
            minute
          ).padStart(2, "0")}:00`;

          const eventObj = {
            calendarId: "primary",
            requestBody: {
              summary: `💊 ${schedule.pillName}${schedule.dosage ? " - " + schedule.dosage : ""}`,
              description: "Take your scheduled dose of MedKnock.",
              start: { dateTime: eventDateTime, timeZone: "Asia/Kolkata" },
              end: { dateTime: eventDateTime, timeZone: "Asia/Kolkata" },
              reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
            },
          };
          eventPromises.push(insertWithRetry(calendar, eventObj));
        }

        const results = await Promise.allSettled(eventPromises);
        for (const res of results) {
          if (res.status === "fulfilled" && res.value?.data?.id) {
            newEventIds.push(res.value.data.id);
          }
        }
        await sleep(500);
      }

      schedule.googleEventIds = newEventIds;
      schedule.lastSyncedHash = currentHash;
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { googleEventIds: newEventIds, lastSyncedHash: currentHash },
      });
    }
  }
}
