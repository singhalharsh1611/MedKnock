import prisma from "../config/prismaClient.js";
import { callLLM, streamLLM } from "../utils/llmClient.js";

export class ChatbotService {
  static async getChatbotResponseStream(userId, question, history, onChunk) {
    if (!question) throw new Error("Question is required.");

    const schedules = await prisma.schedule.findMany({ where: { userId } });
    const recentLogs = await prisma.doseLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 15
    });

    const formattedHistory = history
      .map(msg => `${msg.sender === 'bot' ? 'Aide' : 'User'}: ${msg.content}`)
      .join('\n');

    const prompt = `
      You are MedKnock Aide, an expert assistant for a medication reminder app.
      Answer the user's question based ONLY on the data provided below. 
      Incase of any medical help the user need like some sort of query on medication tell him some preventive measures to take for that issue, if issue is not clear ask it more clearly.
      ***IMPORTANT: Format your answer using Markdown. Use lists for schedules and bold text for medication names.***
      Keep your answer concise, friendly, and helpful 
      ---
      CONVERSATION HISTORY:
      ${formattedHistory}
      ---
      CONTEXT:
      - Today's Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      - User's Medication Schedules: ${JSON.stringify(schedules, null, 2)}
      - User's Recent Dose History (last 15 logs): ${JSON.stringify(recentLogs, null, 2)}
      ---
      USER'S QUESTION: "${question}"
      YOUR ANSWER:
    `;

    await streamLLM([{ text: prompt }], onChunk);
  }
}
