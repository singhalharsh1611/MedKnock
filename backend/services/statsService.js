import prisma from "../config/prismaClient.js";

const parseRange = (query) => {
  const tz = query.tz || "Asia/Kolkata";
  const end = query.end ? new Date(query.end) : new Date();
  const start = query.start ? new Date(query.start) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end, tz };
};

const toDateKeyISO = (date, tz = "Asia/Kolkata") => new Date(date).toLocaleDateString("en-CA", { timeZone: tz });

export class StatsService {
  static async getOverview(userId, query) {
    const { start, end } = parseRange(query);

    const rows = await prisma.doseLog.groupBy({
      by: ["status"],
      where: { userId, timestamp: { gte: start, lte: end } },
      _count: { status: true },
    });

    const totals = { taken: 0, missed: 0 };
    rows.forEach((r) => {
      if (r.status === "taken") totals.taken = r._count.status;
      else if (r.status === "missed") totals.missed = r._count.status;
    });

    const total = totals.taken + totals.missed;
    const adherence = total === 0 ? null : (totals.taken / total) * 100;

    return { totals, total, adherence };
  }

  static async getDaily(userId, query) {
    const { start, end, tz } = parseRange(query);

    const logs = await prisma.doseLog.findMany({
      where: { userId, timestamp: { gte: start, lte: end } },
      select: { timestamp: true, status: true },
    });

    const map = new Map();
    logs.forEach((log) => {
      const day = toDateKeyISO(log.timestamp, tz);
      if (!map.has(day)) map.set(day, { taken: 0, missed: 0 });
      if (log.status === "taken") map.get(day).taken++;
      if (log.status === "missed") map.get(day).missed++;
    });

    const days = [];
    let cur = new Date(start);
    while (cur <= end) {
      days.push(toDateKeyISO(cur, tz));
      cur.setDate(cur.getDate() + 1);
    }

    const series = days.map((day) => ({
      date: day,
      taken: map.get(day)?.taken || 0,
      missed: map.get(day)?.missed || 0,
    }));

    return { series };
  }

  static async getMedicationStats(userId, query) {
    const { start, end } = parseRange(query);

    const logs = await prisma.doseLog.findMany({
      where: { userId, timestamp: { gte: start, lte: end } },
      include: { schedule: true },
    });

    const medMap = new Map();
    logs.forEach((log) => {
      const pillName = log.schedule?.pillName || "Unknown";
      if (!medMap.has(pillName)) medMap.set(pillName, { _id: pillName, taken: 0, missed: 0 });
      if (log.status === "taken") medMap.get(pillName).taken++;
      if (log.status === "missed") medMap.get(pillName).missed++;
    });

    const rows = Array.from(medMap.values()).sort((a, b) => b.missed - a.missed);
    return { meds: rows };
  }

  static async getStreak(userId, query) {
    const tz = query.tz || "Asia/Kolkata";
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const docs = await prisma.doseLog.findMany({
      where: { userId, status: "taken", timestamp: { gte: cutoff } },
      select: { timestamp: true },
    });

    const takenDays = new Set(docs.map((d) => toDateKeyISO(d.timestamp, tz)));

    let streak = 0;
    let cursor = new Date();
    while (takenDays.has(toDateKeyISO(cursor, tz))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { streakDays: streak };
  }

  static async getUpcoming(userId, query) {
    const windowHours = Number(query.windowHours || 6);
    const now = new Date();

    const schedules = await prisma.schedule.findMany({
      where: { userId, isActive: true },
    });

    const upcoming = [];
    for (const s of schedules) {
      (s.times || []).forEach((timeStr) => {
        const [hh, mm] = timeStr.split(":").map(Number);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

        if (today >= now && today - now <= windowHours * 3600 * 1000) {
          upcoming.push({
            scheduleId: s.id,
            pillName: s.pillName,
            time: timeStr,
            at: today.toISOString(),
          });
        }
      });
    }

    upcoming.sort((a, b) => new Date(a.at) - new Date(b.at));
    return { upcoming };
  }
}
