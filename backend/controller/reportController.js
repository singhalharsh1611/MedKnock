import Report from "../models/reportModel.js";
import { Readable } from "stream";
import dotenv from "dotenv";
import cloudinary from "../config/cloudinaryConfig.js";
dotenv.config();


export const getUserReports = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch reports" });
  }
};

export const analyzeReport = async (req, res) => {
  const userId = req.user?.id;
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated." });
    }

    const cloudinaryUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "reports" },
        (error, result) => {
          if (error || !result)
            return reject(error || new Error("Cloudinary upload failed."));
          resolve(result.secure_url);
        }
      );
      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    const base64Data = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    console.log("report file uploaded !");
    // Ask for a JSON object for easy parsing on the frontend.
    const prompt = `
            Analyze the attached medical report. Respond with a valid JSON object only.
            The JSON object should have the following keys: "summary", "keyMetrics", "abnormalities", "suggestions".
            - "summary": A short, 2-3 line overview of the report.
            - "keyMetrics": A string listing the most important metrics or findings, separated by semicolons.
            - "abnormalities": A string listing any potential health insights or abnormalities, separated by semicolons. If none, return "None noted".
            - "suggestions": A string listing simple, actionable next steps, separated by semicolons.

            If the file is not a medical report, return a JSON object with a single key "error" and the value "This file does not appear to be a valid medical report."
        `;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
      throw new Error(
        `Gemini API failed: ${apiResponse.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }
    console.log("gemini respond");

    const data = await apiResponse.json();
   
    let analysisText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      '{"error": "Could not interpret this report."}';
    analysisText = analysisText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    
    const newReport = await Report.create({
      userId, 
      fileName: req.file.originalname,
      cloudinaryUrl: cloudinaryUrl,
      summary: analysisText, 
      analyzed: true,
    });

    res.status(201).json({ success: true, report: newReport });
  } catch (err) {
    console.error("Analysis Controller Error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: err.message || "An internal server error occurred.",
      });
  }
};

// Controller to delete a report
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    
    if (report.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

   

    await report.deleteOne();

    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
