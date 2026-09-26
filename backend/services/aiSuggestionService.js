import prisma from "../config/prismaClient.js";
import { callLLM } from "../utils/llmClient.js";

const toDateKeyISO = (date, tz = "Asia/Kolkata") => new Date(date).toLocaleDateString("en-CA", { timeZone: tz });

export class AISuggestionService {
  static async getAISuggestions(userId, query) {
    const tz = query.tz || "Asia/Kolkata";
    const now = new Date();

    const [schedules, doseLogs] = await Promise.all([
      prisma.schedule.findMany({ where: { userId } }),
      prisma.doseLog.findMany({
        where: { userId, timestamp: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    if (schedules.length === 0) return ["No schedules found for this user."];

    const totals = { taken: 0, missed: 0 };
    for (const log of doseLogs) {
      if (log.status === "taken") totals.taken++;
      if (log.status === "missed") totals.missed++;
    }
    const adherence = totals.taken + totals.missed > 0 ? (totals.taken / (totals.taken + totals.missed)) * 100 : 0;

    const dailyMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyMap[toDateKeyISO(d, tz)] = { taken: 0, missed: 0 };
    }
    for (const log of doseLogs) {
      const key = toDateKeyISO(log.timestamp, tz);
      if (!dailyMap[key]) continue;
      if (log.status === "taken") dailyMap[key].taken++;
      if (log.status === "missed") dailyMap[key].missed++;
    }
    const dailySeries = Object.entries(dailyMap).reverse().map(([date, { taken, missed }]) => ({
      date,
      taken,
      missed,
      adherence: taken + missed > 0 ? ((taken / (taken + missed)) * 100).toFixed(1) : 0,
    }));

    const medsMap = {};
    for (const s of schedules) medsMap[s.pillName] = { taken: 0, missed: 0, risk: s.riskScore || 0 };

    const scheduleMap = Object.fromEntries(schedules.map((s) => [s.id.toString(), s]));
    for (const log of doseLogs) {
      const schedule = scheduleMap[log.scheduleId?.toString()];
      if (!schedule) continue;
      const m = medsMap[schedule.pillName];
      if (log.status === "taken") m.taken++;
      if (log.status === "missed") m.missed++;
    }

    const meds = Object.entries(medsMap).map(([pillName, v]) => ({
      pillName,
      ...v,
      adherence: v.taken + v.missed > 0 ? ((v.taken / (v.taken + v.missed)) * 100).toFixed(1) : "0.0",
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

    return suggestions;
  }
}
