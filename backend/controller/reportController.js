// controllers/reportController.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const analyzeReport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = path.resolve(req.file.path);
    const mimeType = req.file.mimetype;

    // convert file to base64 for Gemini
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString("base64");

    const prompt = `
      You are a professional medical report summarizer.
      Analyze the attached report and provide:
      1. A short summary (2-3 lines)
      2. Key metrics or findings
      3. Possible health insights or abnormalities (if any)
      4. Suggestions or next steps in simple language
      ---
      If the file is not a medical report, respond with:
      "This file doesn't seem to be a valid medical report."
    `;

    // Call Gemini API
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: prompt },
            ],
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(`Gemini API failed: ${apiResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await apiResponse.json();

    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t interpret this report.";

    // Clean up file after processing (optional)
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("Report analysis error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to analyze report",
      error: err.message,
    });
  }
};
