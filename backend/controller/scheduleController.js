import mongoose from "mongoose";
import Schedule from "../models/scheduleModel.js";
import DoseLog from "../models/doseLogModel.js";
import User from "../models/userModel.js";
import { google } from "googleapis";

// safely parse and validate time strings array
const normalizeTimes = (times) => {
  if (!Array.isArray(times)) return [];
  return times.map((t) => String(t).trim()).filter((t) => t.length > 0);
};

const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );
};

// create new schedule

export const createSchedule = async (req, res, next) => {
  try {
    console.log("req.user at createSchedule:", req.user);
    const userId = req.user?.id; // set by auth middleware
    const { pillName, dosage, times, riskScore, quantity, startDate } =
      req.body;

    // Authentication check
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Validation
    if (!pillName || !pillName.trim()) {
      return res.status(400).json({ message: "pillName is required" });
    }

    const timesArr = normalizeTimes(times);
    if (!timesArr || timesArr.length === 0) {
      return res.status(400).json({
        message: 'Times must be a non-empty array of strings like "07:30"',
      });
    }

    //CHECK IF  already exist
    const exist = await Schedule.findOne({ pillName, userId });
    if (exist) {
      return res
        .status(201)
        .json({ success: false, message: "Schedule already exist" });
    }
    // Create schedule
    const schedule = await Schedule.create({
      userId,
      pillName: pillName.trim(),
      dosage: dosage?.trim() ?? "",
      times: timesArr,
      riskScore: typeof riskScore === "number" ? riskScore : 0, // default 0
      quantity: typeof quantity === "number" ? quantity : 0, // default 0
      startDate: startDate ? new Date(startDate) : undefined, // uses default in schema if undefined
    });

    //add to calendar
    const user = await User.findById(userId);
    if (user.googleCalendarToken && user.googleRefreshToken) {
      // Run in background — don’t block the response
      syncDosesToGoogleCalendar(user).catch((err) =>
        console.error("Background calendar sync failed:", err)
      );
    }

    return res.status(201).json(schedule);
  } catch (err) {
    return next(err);
  }
};

// GET /api/schedules
export const getSchedules = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    //get user's streak
    const user = await User.findById(userId).select("currentStreak");

    const schedules = await Schedule.find({ userId }).sort({ createdAt: -1 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    //counters for stats
    let totalDosesToday = 0;
    let takenDosesToday = 0;

    const now = new Date();
    const items = [];

    for (const schedule of schedules) {
      if (schedule.isActive) {
        totalDosesToday += schedule.times.length;

        const takenCountForSchedule = await DoseLog.countDocuments({
          // counting log that has already taken
          scheduleId: schedule._id,
          userId,
          status: "taken",
          timestamp: { $gte: todayStart, $lte: todayEnd },
        });
        takenDosesToday += takenCountForSchedule;
      }
      // Compute today’s dose times
      const timesToday = schedule.times.map((t) => getTimeForToday(t));

      // Check if dose can be logged now (+-1hr)
      let canLog = false;
      const missedTimes = [];
      for (const doseTime of timesToday) {
        const windowStart = new Date(doseTime.getTime() - 60 * 60 * 1000);
        const windowEnd = new Date(doseTime.getTime() + 60 * 60 * 1000);
        const taken = await DoseLog.findOne({
          scheduleId: schedule._id,
          userId,
          timestamp: { $gte: windowStart, $lte: windowEnd },
          status: "taken",
        });
        const diff = Math.abs(doseTime.getTime() - now.getTime());
        if (!taken && diff <= 60 * 60 * 1000 && schedule.quantity > 0) {
          canLog = true;
        }
      }

      // mark missed doses older than 1h
      for (const doseTime of timesToday) {
        if (doseTime.getTime() + 1 * 60 * 60 * 1000 < now.getTime()) {
          const existing = await DoseLog.findOne({
            scheduleId: schedule._id,
            userId,
            timestamp: {
              $gte: doseTime,
              $lte: new Date(doseTime.getTime() + 2 * 60 * 60 * 1000),
            },
          });
          if (!existing) {
            await DoseLog.create({
              scheduleId: schedule._id,
              userId,
              status: "missed",
              timestamp: doseTime,
            });
            const h = doseTime.getHours().toString().padStart(2, "0");
            const m = doseTime.getMinutes().toString().padStart(2, "0");
            missedTimes.push(`${h}:${m}`);
          } else if (existing.status === "missed") {
            const h = doseTime.getHours().toString().padStart(2, "0");
            const m = doseTime.getMinutes().toString().padStart(2, "0");
            missedTimes.push(`${h}:${m}`);
          }
        }
      }

      items.push({ ...schedule.toObject(), canLog, missedTimes });
    }

    return res.status(200).json({
      items,
      total: items.length,
      stats: { totalDosesToday, takenDosesToday },
      currentStreak: user?.currentStreak || 0,
    });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/schedules/:id
export const updateScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid schedule id" });
    }

    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const { pillName, dosage, times, riskScore, quantity, startDate } =
      req.body;

    if (pillName !== undefined) schedule.pillName = String(pillName).trim();
    if (dosage !== undefined) schedule.dosage = String(dosage).trim();

    if (times !== undefined) {
      // 👇 normalize or fallback to array of strings
      const arr = Array.isArray(times) ? times.map(String) : [];
      if (arr.length === 0) {
        return res
          .status(400)
          .json({ message: "times must be a non-empty array" });
      }
      schedule.times = arr;
    }

    if (riskScore !== undefined) {
      if (typeof riskScore !== "number") {
        return res.status(400).json({ message: "riskScore must be a number" });
      }
      schedule.riskScore = riskScore;
    }

    if (quantity !== undefined) {
      if (isNaN(quantity)) {
        return res.status(400).json({ message: "quantity must be a number" });
      }
      schedule.quantity = Number(quantity);
    }

    if (startDate !== undefined) {
      const parsedDate = new Date(startDate);
      if (isNaN(parsedDate.getTime())) {
        return res
          .status(400)
          .json({ message: "startDate must be a valid date" });
      }
      schedule.startDate = parsedDate;
    }

    await schedule.save();

    // re sync all schedules after any update
    const user = await User.findById(userId);
    if (user.googleCalendarToken && user.googleRefreshToken) {
      console.log(`[updateScheduleById] Triggering calendar sync for user ${userId} after update.`);
      syncDosesToGoogleCalendar(user).catch((err) =>
        console.error("Background calendar sync failed after update:", err)
      );
    }

    return res.status(200).json(schedule);
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/schedules/:id
export const deleteScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) return res.status(404).json({ message: "Not found" });
    const user = await User.findById(userId);

    // Delete linked Google Calendar events first
    if (user.googleCalendarToken && user.googleRefreshToken) {
      try {
        // --- ADDED LOG ---
        console.log(
          `[deleteScheduleById] Attempting to delete Google Calendar events for schedule: ${schedule._id}`
        );
        await deleteGoogleEventsForSchedule(user, schedule);
      } catch (err) {
        console.error("Failed to delete Google Calendar events:", err);
      }
    }

    await Schedule.deleteOne({ _id: id, userId });

    return res.status(200).json({ success: true, message: "Deleted", id });
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/schedules/:id
export const getScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid schedule id" });
    }

    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    return res.status(200).json(schedule);
  } catch (err) {
    return next(err);
  }
};

// patch /api/schedule/:id/toogle

export const toggleScheduleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const schedule = await Schedule.findOne({ _id: id, userId });

    if (!schedule)
      return res.status(404).json({ message: "Schedule not found" });

    // Toggle isActive
    schedule.isActive = !schedule.isActive;
    await schedule.save();

    const user = await User.findById(userId);

    if (user.googleCalendarToken && user.googleRefreshToken) {
      if (schedule.isActive) {
        // If the schedule is now ACTIVE, re-sync all of the user's schedules
        console.log(
          `[toggleScheduleActive] Re-syncing all schedules for user after activating: ${schedule._id}`
        );
        syncDosesToGoogleCalendar(user).catch((err) =>
          console.error("Background reactivate sync failed:", err)
        );
      } else {
        // If the schedule is now INACTIVE, just delete its events
        console.log(
          `[toggleScheduleActive] Deleting events for INACTIVE schedule: ${schedule._id}`
        );
        deleteGoogleEventsForSchedule(user, schedule).catch((err) =>
          console.error("Background inactive delete failed:", err)
        );
      }
    }

    const schedules = await Schedule.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    // console.log(schedules);
    return res.status(200).json({
      success: true,
      message: "Schedule toggled successfully",
      schedules, // full updated list
    });
  } catch (err) {
    next(err);
  }
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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

export const syncDosesToGoogleCalendar = async (user) => {
  const userId = user._id;
  console.log(`--- Calendar Sync for user: ${userId} ---`);

  if (!user.googleCalendarToken || !user.googleRefreshToken) {
    console.error(`Missing Google tokens for user ${userId}`);
    return;
  }

  const schedules = await Schedule.find({ userId, isActive: true });
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
    if (schedule.googleEventIds && schedule.googleEventIds.length > 0) {
      try {
        console.log(`Cleaning up old events for schedule ${schedule._id}...`);
        await deleteGoogleEventsForSchedule(user, schedule);
      } catch (err) {
        console.error(
          `Failed to delete previous events for ${schedule._id}:`,
          err.message
        );
      }
    }
    const dosesPerDay = schedule.times.length;
    if (!dosesPerDay || schedule.quantity <= 0) continue;

    let baseDate = new Date(schedule.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (baseDate < today) baseDate = today;

    const daysToSync = Math.ceil(schedule.quantity / dosesPerDay);

    for (let i = 0; i < daysToSync; i++) {
      const eventDate = new Date(baseDate);
      eventDate.setDate(baseDate.getDate() + i);

      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, "0");
      const date = String(eventDate.getDate()).padStart(2, "0");

      for (let j = 0; j < dosesPerDay; j++) {
        if (i * dosesPerDay + j >= schedule.quantity) break;

        const [hour, minute] = schedule.times[j].split(":").map(Number);
        const eventDateTime = `${year}-${month}-${date}T${String(hour).padStart(
          2,
          "0"
        )}:${String(minute).padStart(2, "0")}:00`;

        // Insert event
        const eventRes = await insertWithRetry(calendar, {
          calendarId: "primary",
          requestBody: {
            summary: `💊 ${schedule.pillName}${
              schedule.dosage ? " - " + schedule.dosage : ""
            }`,
            description: `Take your scheduled dose of MedKnock.`,
            start: {
              dateTime: eventDateTime,
              timeZone: "Asia/Kolkata",
            },
            end: {
              dateTime: eventDateTime,
              timeZone: "Asia/Kolkata",
            },
            reminders: {
              useDefault: false,
              overrides: [{ method: "popup", minutes: 0 }],
            },
          },
        });

        // Store the eventId for later deletion
        if (!schedule.googleEventIds) schedule.googleEventIds = [];
        schedule.googleEventIds.push(eventRes.data.id);
        await sleep(300);
      }
    }

    await schedule.save(); // Save event IDs in DB
  }

  console.log(`--- Calendar Sync Completed for user ${userId} ---`);
};

async function deleteGoogleEventsForSchedule(user, schedule) {
  console.log(`---> Starting deletion for schedule: ${schedule._id}`);
  if (
    !schedule.googleEventIds ||
    schedule.googleEventIds.length === 0 ||
    !user.googleCalendarToken
  ) {
    // --- ADDED LOG ---
    console.log("... Deletion function returned early.");
    if (!schedule.googleEventIds || schedule.googleEventIds.length === 0) {
      console.log("... Reason: Schedule has no googleEventIds to delete.");
    }
    if (!user.googleCalendarToken) {
      console.log("... Reason: User is missing Google Token.");
    }
    return;
  }

  console.log(
    `---> Found ${schedule.googleEventIds.length} events to delete for schedule ${schedule._id}`
  );
  console.log(`---> Event IDs: [${schedule.googleEventIds.join(", ")}]`);

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
      console.log(`---> Successfully deleted event: ${eventId}`);
      await sleep(200);
    } catch (err) {
      console.warn(`Failed to delete event ${eventId}:`, err.message);
    }
  }

  schedule.googleEventIds = [];
  await schedule.save();
  console.log(`---> Cleared event IDs from DB for schedule ${schedule._id}`);
}
