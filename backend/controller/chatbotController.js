import Schedule from '../models/scheduleModel.js';
import DoseLog from '../models/doseLogModel.js';
import dotenv from "dotenv";
dotenv.config();

export const handleChat = async (req, res) => {
  try {
    const { question, history } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized Access" });
    if (!question) return res.status(400).json({ message: "Question is required." });

    // Fetch context from your database (same as before)
    const schedules = await Schedule.find({ userId });
    const recentLogs = await DoseLog.find({ userId }).sort({ timestamp: -1 }).limit(15);

    const formattedHistory = history
      .map(msg => `${msg.sender === 'bot' ? 'Aide' : 'User'}: ${msg.content}`)
      .join('\n');

    // prompt
    const prompt = `
      You are Alchemist's Aide, an expert assistant for a medication reminder app.
      Answer the user's question based ONLY on the data provided below. 
      Incase of any medical help the user need like some sort of query on medication tell him some preventive measures to take for that issue, if issue is not clear ask it more clearly.
      ***IMPORTANT: Format your answer using Markdown. Use lists for schedules and bold text for medication names.***
      Keep your answer concise, friendly, and helpful with a magical theme.
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

    // Call the Gemini API
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] },
        ],
      }),
    });

    if (!apiResponse.ok) {
      // If the API returns a non-200 status, throw an error
      const errorData = await apiResponse.json();
      throw new Error(`API request failed with status ${apiResponse.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await apiResponse.json();

    // Extract the text from the response
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm sorry, I couldn't find an answer. Please try again.";

    // Send the response back to the user
    return res.status(200).json({ answer });

  } catch (err) {
    console.error("Chatbot controller error:", err);
    res.status(500).json({ message: "Failed to get a response from the Alchemist." });
  }
};