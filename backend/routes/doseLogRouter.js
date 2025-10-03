import express from "express";
import { logDoseAsTaken } from "../controller/doseLogController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware); // all routes need JWT

// user logs dose as taken
router.post("/:scheduleId/taken", logDoseAsTaken);

export default router;