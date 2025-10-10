import { Readable } from "stream";
import cloudinary from "../config/cloudinaryConfig.js";
import fetch from "node-fetch";

export const analyzePrescription = async (req, res) => {
    try {
        // 🧪 1. Validation
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded." });
        }
        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        console.log("Starting prescription analysis...");

        // ☁️ 2. Cloudinary Upload (optional but useful)
        const cloudinaryUrl = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "auto", folder: "prescriptions" },
                (error, result) => {
                    if (error || !result)
                        return reject(error || new Error("Cloudinary upload failed."));
                    resolve(result.secure_url);
                }
            );
            Readable.from(req.file.buffer).pipe(uploadStream);
        });
        console.log("ready to propmt");
        // 📷 3. Prepare Image for Gemini
        const base64Data = req.file.buffer.toString("base64");
        const mimeType = req.file.mimetype;

        // 🧠 4. Prompt
        const prompt = `
Analyze the attached image of a medical prescription.
Respond ONLY with a valid JSON array of medicine objects, no extra text.

Each object should have:
{
  "pillName": "string",
  "dosage": "string (only numeric strength like '500mg'; if unknown, leave empty)",
  "times": ["HH:MM", "HH:MM"],
  "quantity": "number",
  "startDate": "string (YYYY-MM-DD)"
}

- Convert text like "morning, afternoon, night" into sensible times such as ["08:00", "13:00", "20:00"].
- Ignore instructions like "before food" or "after food" in dosage.
- If no numeric strength is found, leave dosage as an empty string.
- If only one medicine is found, return an array with one object.
- If the file is not a valid prescription, return {"error": "Invalid prescription"}.
- Return strictly valid JSON.
`;


        const url =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

        // 🚀 5. Call Gemini API
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

        // 🛑 6. Check for Gemini API errors
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(
                `Gemini API failed: ${apiResponse.status} - ${JSON.stringify(errorData)}`
            );
        }
        console.log("got result from gemini")
        const data = await apiResponse.json();
        let jsonText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            '{"error": "Could not extract prescription details."}';

        // 🧹 7. Clean and parse JSON
        jsonText = jsonText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .replace(/[“”]/g, '"')
            .trim();

        let medicineData;
        try {
            medicineData = JSON.parse(jsonText);

            // if AI returns a single object instead of an array, fix it
            if (!Array.isArray(medicineData)) {
                medicineData = [medicineData];
            }
        } catch (e) {
            console.error("AI returned invalid JSON:", jsonText);
            throw new Error("AI response was not valid JSON.");
        }

        // 📤 8. Final response
        res.status(200).json({
            success: true,
            message: "Prescription analyzed successfully.",
            data: medicineData,
            cloudinaryUrl: cloudinaryUrl,
        });
    } catch (err) {
        console.error("Prescription Extraction Error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "An internal server error occurred.",
        });
    }
};
