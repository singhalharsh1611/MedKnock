import { ReportService } from "../services/reportService.js";

export const getUserReports = async (req, res) => {
  try {
    const reports = await ReportService.getUserReports(req.user.id);
    res.status(200).json({ success: true, reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
};

export const analyzeReport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
    if (!req.user) return res.status(401).json({ success: false, message: "User not authenticated." });

    const report = await ReportService.analyzeReport(
      req.user.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error("Analysis Controller Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "An internal server error occurred.",
    });
  }
};

export const deleteReport = async (req, res) => {
  try {
    await ReportService.deleteReport(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (err) {
    const status = err.message === "Not authorized" ? 401 : err.message === "Report not found" ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

export const changeReportFileName = async (req, res) => {
  try {
    const updatedReport = await ReportService.changeReportFileName(req.user.id, req.params.id, req.body.newFileName);
    res.status(200).json({
      success: true,
      message: "File name updated successfully",
      report: updatedReport,
    });
  } catch (err) {
    const status = err.message === "Not authorized" ? 403 : err.message === "Report not found" ? 404 : err.message === "New file name is required" ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};
