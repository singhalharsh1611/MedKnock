import prisma from "../config/prismaClient.js";
import { Readable } from "stream";
import cloudinary from "../config/cloudinaryConfig.js";
import { callLLM } from "../utils/llmClient.js";

export class ReportService {
  static async getUserReports(userId) {
    return await prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async analyzeReport(userId, fileBuffer, mimeType, originalName) {
    const cloudinaryUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "reports" },
        (error, result) => {
          if (error || !result) return reject(error || new Error("Cloudinary upload failed."));
          resolve(result.secure_url);
        }
      );
      Readable.from(fileBuffer).pipe(uploadStream);
    });

    const base64Data = fileBuffer.toString("base64");
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
      { text: prompt },
    ]);

    if (!analysisText) {
      analysisText = '{"error": "Could not interpret this report."}';
    }

    analysisText = analysisText.replace(/```json/g, "").replace(/```/g, "").trim();

    const newReport = await prisma.report.create({
      data: {
        userId,
        fileName: originalName,
        cloudinaryUrl,
        summary: analysisText,
        analyzed: true,
      },
    });

    return newReport;
  }

  static async deleteReport(userId, reportId) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Report not found");
    if (report.userId !== userId) throw new Error("Not authorized");

    await prisma.report.delete({ where: { id: reportId } });
    return reportId;
  }

  static async changeReportFileName(userId, reportId, newFileName) {
    if (!newFileName || newFileName.trim() === "") {
      throw new Error("New file name is required");
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Report not found");
    if (report.userId !== userId) throw new Error("Not authorized");

    return await prisma.report.update({
      where: { id: reportId },
      data: { fileName: newFileName.trim() },
    });
  }
}
