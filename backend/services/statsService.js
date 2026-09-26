import prisma from "../config/prismaClient.js";
import Redis from "ioredis";

const redisConfig = process.env.REDIS_URL || { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
const redis = new Redis(redisConfig);
const CACHE_TTL = 300; // Cache stats for 5 minutes

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
    const cacheKey = `stats:overview:${userId}:${start.toISOString()}:${end.toISOString()}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

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

    const result = { totals, total, adherence };
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  static async getDaily(userId, query) {
    const { start, end, tz } = parseRange(query);
    const cacheKey = `stats:daily:${userId}:${start.toISOString()}:${end.toISOString()}:${tz}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

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

    const result = { series };
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  static async getMedicationStats(userId, query) {
    const { start, end } = parseRange(query);
    const cacheKey = `stats:meds:${userId}:${start.toISOString()}:${end.toISOString()}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Optimize with groupBy instead of returning all logs
    const stats = await prisma.doseLog.groupBy({
      by: ["scheduleId", "status"],
      where: { userId, timestamp: { gte: start, lte: end } },
      _count: { status: true },
    });

    const schedules = await prisma.schedule.findMany({
      where: { userId, id: { in: stats.map(s => s.scheduleId) } },
      select: { id: true, pillName: true }
    });
    const scheduleMap = Object.fromEntries(schedules.map(s => [s.id, s.pillName]));

    const medMap = new Map();
    stats.forEach(stat => {
      const pillName = scheduleMap[stat.scheduleId] || "Unknown";
      if (!medMap.has(pillName)) medMap.set(pillName, { _id: pillName, taken: 0, missed: 0 });
      
      if (stat.status === "taken") medMap.get(pillName).taken = stat._count.status;
      if (stat.status === "missed") medMap.get(pillName).missed = stat._count.status;
    });

    const rows = Array.from(medMap.values()).sort((a, b) => b.missed - a.missed);
    const result = { meds: rows };
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  static async getStreak(userId, query) {
    const tz = query.tz || "Asia/Kolkata";
    const cacheKey = `stats:streak:${userId}:${tz}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

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

    const result = { streakDays: streak };
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    return result;
  }

  static async getUpcoming(userId, query) {
    const windowHours = Number(query.windowHours || 6);
    const tz = query.tz || "Asia/Kolkata";
    const cacheKey = `stats:upcoming:${userId}:${windowHours}:${tz}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

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
    const result = { upcoming };
    await redis.set(cacheKey, JSON.stringify(result), "EX", 60); // Cache upcoming for 1 min
    return result;
  }
}
