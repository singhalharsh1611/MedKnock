import prisma from "../config/prismaClient.js";
import { Readable } from "stream";
import dotenv from "dotenv";
import { callLLM } from "../utils/llmClient.js";
import cloudinary from "../config/cloudinaryConfig.js";
dotenv.config();


export const getUserReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
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

    let analysisText = await callLLM([
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: prompt }
    ]);
    if (!analysisText) {
        analysisText = '{"error": "Could not interpret this report."}';
    }
    console.log("LLM respond");
    analysisText = analysisText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    
    const newReport = await prisma.report.create({
      data: {
        userId, 
        fileName: req.file.originalname,
        cloudinaryUrl: cloudinaryUrl,
        summary: analysisText, 
        analyzed: true,
      }
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
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    
    if (report.userId.toString() !== req.user.id.toString()) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

   

    await prisma.report.delete({ where: { id: report.id } });

    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Controller to change the report file name
export const changeReportFileName = async (req, res) => {
  try {
    const { id } = req.params; // Report ID from URL
    const { newFileName } = req.body; // New name from request body

    if (!newFileName || newFileName.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "New file name is required" });
    }

    const report = await prisma.report.findUnique({ where: { id } });

    if (!report) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    // Check if user owns this report
    if (report.userId.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Update and save new file name
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: { fileName: newFileName.trim() }
    });

    res.status(200).json({
      success: true,
      message: "File name updated successfully",
      report: updatedReport,
    });
  } catch (err) {
    console.error("Change File Name Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update file name" });
  }
};
