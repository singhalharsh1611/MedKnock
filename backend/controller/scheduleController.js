import prisma from "../config/prismaClient.js";
import { google } from "googleapis";
import crypto from "crypto";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const normalizeTimes = (times) => {
  if (!Array.isArray(times)) return [];
  return times.map((t) => String(t).trim()).filter((t) => t.length > 0);
};

const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};

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

async function deleteGoogleEventsForSchedule(user, schedule) {
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
    data: { googleEventIds: [] }
  });
}

export const syncDosesToGoogleCalendar = async (user) => {
  const userId = user.id;
  console.log(`--- Calendar Sync for user: ${userId} ---`);

  if (!user.googleCalendarToken || !user.googleRefreshToken) {
    console.error(`Missing Google tokens for user ${userId}`);
    return;
  }

  const schedules = await prisma.schedule.findMany({
    where: { userId, isActive: true }
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
    if (schedule.lastSyncedHash === currentHash) {
      console.log(`Skipping unchanged schedule: ${schedule.pillName}`);
      continue;
    }

    if (schedule.googleEventIds?.length) {
      await deleteGoogleEventsForSchedule(user, schedule);
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
      data: {
        googleEventIds: newEventIds,
        lastSyncedHash: currentHash
      }
    });
  }

  console.log(`--- Calendar Sync Completed for user ${userId} ---`);
};


// CREATE schedule
export const createSchedule = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { pillName, dosage, times, riskScore, quantity, startDate } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!pillName || !pillName.trim()) {
      return res.status(400).json({ message: "pillName is required" });
    }

    const timesArr = normalizeTimes(times);
    if (!timesArr.length) {
      return res.status(400).json({ message: 'Times must be like ["07:30", "12:00"]' });
    }

    const exist = await prisma.schedule.findFirst({
      where: { pillName, userId }
    });
    if (exist) {
      return res.status(201).json({ success: false, message: "Schedule already exists" });
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId,
        pillName: pillName.trim(),
        dosage: dosage?.trim() ?? "",
        times: timesArr,
        riskScore: Number.isFinite(riskScore) ? riskScore : 0,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        startDate: startDate ? new Date(startDate) : undefined,
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.googleCalendarToken && user.googleRefreshToken) {
      syncDosesToGoogleCalendar(user).catch((err) => console.error("Calendar sync failed:", err));
    }

    return res.status(201).json(schedule);
  } catch (err) {
    return next(err);
  }
};

// GET all schedules
export const getSchedules = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true }
    });
    
    const schedules = await prisma.schedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await prisma.doseLog.findMany({
      where: {
        userId,
        timestamp: { gte: todayStart, lte: todayEnd },
      }
    });

    const logsBySchedule = {};
    for (const log of todayLogs) {
      if (!logsBySchedule[log.scheduleId]) logsBySchedule[log.scheduleId] = [];
      logsBySchedule[log.scheduleId].push(log);
    }

    let totalDosesToday = 0;
    let takenDosesToday = 0;
    const now = new Date();

    const items = schedules.map((schedule) => {
      const timesToday = schedule.times.map((t) => getTimeForToday(t));
      const logs = logsBySchedule[schedule.id] || [];

      totalDosesToday += schedule.isActive ? schedule.times.length : 0;
      takenDosesToday += logs.filter((l) => l.status === "taken").length;

      const missedTimes = [];
      let canLog = false;

      for (const doseTime of timesToday) {
        const diff = Math.abs(now - doseTime);
        const alreadyTaken = logs.some(
          (l) =>
            l.status === "taken" &&
            Math.abs(l.timestamp.getTime() - doseTime.getTime()) <= 60 * 60 * 1000
        );

        if (!alreadyTaken && diff <= 60 * 60 * 1000 && schedule.quantity > 0) {
          canLog = true;
        } else if (!alreadyTaken && doseTime.getTime() + 60 * 60 * 1000 < now.getTime()) {
          missedTimes.push(
            `${doseTime.getHours().toString().padStart(2, "0")}:${doseTime
              .getMinutes()
              .toString()
              .padStart(2, "0")}`
          );
        }
      }

      return { ...schedule, canLog, missedTimes };
    });

    return res.status(200).json({
      items,
      total: items.length,
      stats: { totalDosesToday, takenDosesToday },
      currentStreak: user?.currentStreak || 0,
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE schedule
export const updateScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId }
    });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const { pillName, dosage, times, riskScore, quantity, startDate } = req.body;
    
    const updateData = {};
    if (pillName !== undefined) updateData.pillName = String(pillName).trim();
    if (dosage !== undefined) updateData.dosage = String(dosage).trim();
    if (Array.isArray(times) && times.length > 0) updateData.times = times.map(String);
    if (riskScore !== undefined && typeof riskScore === "number") updateData.riskScore = riskScore;
    if (quantity !== undefined && !isNaN(quantity)) updateData.quantity = Number(quantity);
    if (startDate !== undefined && !isNaN(new Date(startDate).getTime()))
      updateData.startDate = new Date(startDate);

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: updateData
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.googleCalendarToken && user.googleRefreshToken) {
      syncDosesToGoogleCalendar(user).catch((err) => console.error("Sync failed:", err));
    }

    return res.status(200).json(updatedSchedule);
  } catch (err) {
    next(err);
  }
};

// DELETE schedule
export const deleteScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId }
    });
    if (!schedule) return res.status(404).json({ message: "Not found" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.googleCalendarToken && user.googleRefreshToken) {
      await deleteGoogleEventsForSchedule(user, schedule);
    }

    await prisma.schedule.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Deleted", id });
  } catch (err) {
    next(err);
  }
};

// TOGGLE active
export const toggleScheduleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId }
    });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: { isActive: !schedule.isActive }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.googleCalendarToken && user.googleRefreshToken) {
      if (updatedSchedule.isActive) {
        syncDosesToGoogleCalendar(user).catch(console.error);
      } else {
        deleteGoogleEventsForSchedule(user, updatedSchedule).catch(console.error);
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, message: "Toggled", schedules });
  } catch (err) {
    next(err);
  }
};

// GET by ID
export const getScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const schedule = await prisma.schedule.findFirst({
      where: { id, userId }
    });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });
    
    return res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
};
