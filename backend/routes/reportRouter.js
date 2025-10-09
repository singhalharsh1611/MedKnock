import express from "express";
import upload from "../middlewares/upload.js";
import { analyzeReport, getUserReports, deleteReport } from "../controller/reportController.js";
import authMiddleware from "../middlewares/authMiddleware.js";


const router = express.Router();

// Get all reports for the logged-in user
router.get("/", authMiddleware, getUserReports);

// Analyze a new report
router.post("/analyze", authMiddleware, upload.single("report"), analyzeReport);

// Delete a specific report
router.delete("/:id", authMiddleware, deleteReport);

export default router;