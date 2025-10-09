import express from "express";
import upload from "../middlewares/upload.js";
import { analyzeReport } from "../controller/reportController.js";

const router = express.Router();

router.post("/analyze", upload.single("report"), analyzeReport);

export default router;
