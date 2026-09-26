import prisma from "../config/prismaClient.js";
import { callLLM } from "../utils/llmClient.js";
import Redis from "ioredis";

const redisConfig = process.env.REDIS_URL || { host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null };
const redis = new Redis(redisConfig);
const CACHE_TTL = 3600; // 1 hour cache

const toDateKeyISO = (date, tz = "Asia/Kolkata") => new Date(date).toLocaleDateString("en-CA", { timeZone: tz });

export class AISuggestionService {
  static async getAISuggestions(userId, query) {
    const tz = query.tz || "Asia/Kolkata";
    const cacheKey = `ai-suggestions:${userId}:${tz}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const schedules = await prisma.schedule.findMany({ where: { userId } });
    if (schedules.length === 0) return ["No schedules found for this user."];

    // Optimize: Shift overall counts to Postgres
    const overallStats = await prisma.doseLog.groupBy({
      by: ["status"],
      where: { userId, timestamp: { gte: sevenDaysAgo } },
      _count: { status: true },
    });
    
    const totals = { taken: 0, missed: 0 };
    overallStats.forEach(stat => {
      if (stat.status === "taken") totals.taken = stat._count.status;
      if (stat.status === "missed") totals.missed = stat._count.status;
    });
    const adherence = totals.taken + totals.missed > 0 ? (totals.taken / (totals.taken + totals.missed)) * 100 : 0;

    // Optimize: Shift per-medication counts to Postgres
    const perMedStats = await prisma.doseLog.groupBy({
      by: ["scheduleId", "status"],
      where: { userId, timestamp: { gte: sevenDaysAgo } },
      _count: { status: true },
    });

    const scheduleMap = Object.fromEntries(schedules.map((s) => [s.id.toString(), s]));
    const medsMap = {};
    for (const s of schedules) medsMap[s.pillName] = { taken: 0, missed: 0, risk: s.riskScore || 0 };

    perMedStats.forEach(stat => {
      const schedule = scheduleMap[stat.scheduleId];
      if (schedule) {
        if (stat.status === "taken") medsMap[schedule.pillName].taken = stat._count.status;
        if (stat.status === "missed") medsMap[schedule.pillName].missed = stat._count.status;
      }
    });

    const meds = Object.entries(medsMap).map(([pillName, v]) => ({
      pillName,
      ...v,
      adherence: v.taken + v.missed > 0 ? ((v.taken / (v.taken + v.missed)) * 100).toFixed(1) : "0.0",
    }));

    // For daily trends, it's easier to fetch raw logs for the week and group in JS 
    // rather than dealing with raw SQL date truncation across timezones in Prisma
    const doseLogs = await prisma.doseLog.findMany({
      where: { userId, timestamp: { gte: sevenDaysAgo } },
      select: { timestamp: true, status: true }
    });

    const dailyMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap[toDateKeyISO(d, tz)] = { taken: 0, missed: 0 };
    }
    
    for (const log of doseLogs) {
      const key = toDateKeyISO(log.timestamp, tz);
      if (dailyMap[key]) {
        if (log.status === "taken") dailyMap[key].taken++;
        if (log.status === "missed") dailyMap[key].missed++;
      }
    }
    
    const dailySeries = Object.entries(dailyMap).reverse().map(([date, { taken, missed }]) => ({
      date, taken, missed,
      adherence: taken + missed > 0 ? ((taken / (taken + missed)) * 100).toFixed(1) : 0,
    }));

    let streak = 0;
    const dailyTaken = dailySeries.map((d) => d.taken > 0);
    for (let i = dailyTaken.length - 1; i >= 0; i--) {
      if (dailyTaken[i]) streak++;
      else break;
    }

    const dataSummary = `
User 7-Day Adherence Summary:
- Overall adherence: ${adherence.toFixed(1)}%
- Total doses taken: ${totals.taken}, missed: ${totals.missed}
- Current streak: ${streak} day(s)
- Daily trend:
${dailySeries.map((d) => `  • ${d.date}: ${d.taken} taken, ${d.missed} missed (Adherence: ${d.adherence}%)`).join("\n")}
- Per medication:
${meds.map((m) => `  • ${m.pillName}: ${m.taken} taken, ${m.missed} missed (Adherence: ${m.adherence}%, Risk: ${m.risk})`).join("\n")}
`;

    const prompt = `
You are an expert digital medication coach.

Based on the detailed 7-day medication adherence data below, provide **5 specific, actionable suggestions** to improve the user's medication-taking behavior.
Each suggestion should be practical and targeted — referencing timing patterns, adherence trends, risk levels, or motivation strategies.

${dataSummary}

Respond in the format:
1. **<suggestion>**
2. **<suggestion>**
3. **<suggestion>**
4. **<suggestion>**
5. **<suggestion>**
`;

    const text = await callLLM([{ text: prompt }]);
    const suggestions = text.split(/\n+/).filter((line) => /^\d+\./.test(line)).map((line) => line.replace(/^\d+\.\s*/, "").trim());

    // Cache the suggestions for 1 hour
    await redis.set(cacheKey, JSON.stringify(suggestions), "EX", CACHE_TTL);

    return suggestions;
  }
}
