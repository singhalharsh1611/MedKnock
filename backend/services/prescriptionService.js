import { Readable } from "stream";
import cloudinary from "../config/cloudinaryConfig.js";
import { callLLM } from "../utils/llmClient.js";

export class PrescriptionService {
  static async uploadToCloudinary(fileBuffer) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "prescriptions" },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Cloudinary upload failed."));
          resolve(result.secure_url);
        }
      );
      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }

  static async analyzePrescriptionImage(fileBuffer, mimeType) {
    const base64Data = fileBuffer.toString("base64");

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
- for quantity, it medicine is prescribed for 10 days, thrice a day, then quantity should be 30
- Return strictly valid JSON.
`;

    let jsonText = await callLLM([
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: prompt },
    ]);

    if (!jsonText) {
      throw new Error("Could not extract prescription details.");
    }

    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").replace(/[“”]/g, '"').trim();

    try {
      let medicineData = JSON.parse(jsonText);
      if (!Array.isArray(medicineData)) {
        if (medicineData.error) throw new Error(medicineData.error);
        medicineData = [medicineData];
      }
      return medicineData;
    } catch (e) {
      if (e.message === "Invalid prescription") throw e;
      throw new Error("AI response was not valid JSON.");
    }
  }
}
