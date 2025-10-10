import mongoose from "mongoose";
import DoseLog from "../models/doseLogModel.js";
import Schedule from "../models/scheduleModel.js";
import fetch from "node-fetch";

// Helper
const toDateKeyISO = (date, tz = "Asia/Kolkata") =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: tz });

export const getAISuggestions = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const tz = req.query.tz || "Asia/Kolkata";
    const now = new Date();

    // 1️1 Fetch all user data
    const [schedules, doseLogs] = await Promise.all([
      Schedule.find({ userId }).lean(),
      DoseLog.find({
        userId,
        timestamp: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
      }).lean(),
    ]);

    if (schedules.length === 0) {
      return res.json({ suggestions: ["No schedules found for this user."] });
    }

    // 2️ Compute overview totals
    const totals = { taken: 0, missed: 0 };
    for (const log of doseLogs) {
      if (log.status === "taken") totals.taken++;
      if (log.status === "missed") totals.missed++;
    }
    const adherence =
      totals.taken + totals.missed > 0
        ? (totals.taken / (totals.taken + totals.missed)) * 100
        : 0;

    // 3️ Compute daily stats (7-day trend)
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
    const dailySeries = Object.entries(dailyMap)
      .reverse()
      .map(([date, { taken, missed }]) => ({
        date,
        taken,
        missed,
        adherence:
          taken + missed > 0 ? ((taken / (taken + missed)) * 100).toFixed(1) : 0,
      }));

    // 4️⃣ Per-medication adherence
    const medsMap = {};
    for (const s of schedules) {
      medsMap[s.pillName] = { taken: 0, missed: 0, risk: s.riskScore || 0 };
    }
    for (const log of doseLogs) {
      const schedule = schedules.find(
        (s) => s._id.toString() === log.scheduleId?.toString()
      );
      if (!schedule) continue;
      const m = medsMap[schedule.pillName];
      if (log.status === "taken") m.taken++;
      if (log.status === "missed") m.missed++;

      // to optimise n**2 to n ,  we can create map of schedule then find by log sch id
      // const scheduleMap = Object.fromEntries(schedules.map(s => [s._id.toString(), s]));
      // const schedule = scheduleMap[log.scheduleId?.toString()];

    }
    const meds = Object.entries(medsMap).map(([pillName, v]) => ({
      // Converts the medicine map into an array.
      // Computes adherence percentage per medicine.
      pillName,
      ...v,
      adherence:
        v.taken + v.missed > 0
          ? ((v.taken / (v.taken + v.missed)) * 100).toFixed(1)
          : "0.0",
    }));

    //     [
    //   { pillName: "Atorvastatin", taken: 12, missed: 3, risk: 8, adherence: "80.0" },
    //   { pillName: "Paracetamol", taken: 7, missed: 0, risk: 4, adherence: "100.0" },
    //   { pillName: "Cetrizine", taken: 3, missed: 2, risk: 2, adherence: "60.0" }
    // ]


    // 5️⃣ Streak (simplified: consecutive taken days)
    let streak = 0;
    const dailyTaken = dailySeries.map((d) => d.taken > 0);
    for (let i = dailyTaken.length - 1; i >= 0; i--) {
      if (dailyTaken[i]) streak++;
      else break;
    }

    // 6️⃣ Prepare detailed data summary for Gemini
    const dataSummary = `
User 7-Day Adherence Summary:
- Overall adherence: ${adherence.toFixed(1)}%
- Total doses taken: ${totals.taken}, missed: ${totals.missed}
- Current streak: ${streak} day(s)
- Daily trend:
${dailySeries
        .map(
          (d) =>
            `  • ${d.date}: ${d.taken} taken, ${d.missed} missed (Adherence: ${d.adherence}%)`
        )
        .join("\n")}
- Per medication:
${meds
        .map(
          (m) =>
            `  • ${m.pillName}: ${m.taken} taken, ${m.missed} missed (Adherence: ${m.adherence}%, Risk: ${m.risk})`
        )
        .join("\n")}
`;
    // This builds a structured prompt that tells Gemini:
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

    // 7️⃣ Call Gemini API

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }


    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No suggestions generated.";

    // 8️⃣ Parse formatted suggestions
    const suggestions = text
      .split(/\n+/)
      .filter((line) => /^\d+\./.test(line))
      .map((line) => line.replace(/^\d+\.\s*/, "").trim());

    res.json({ suggestions });
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    res.status(500).json({ error: "Failed to generate AI suggestions" });
  }
};
