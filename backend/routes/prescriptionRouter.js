import express from "express";
import multer from "multer";
import { analyzePrescription } from "../controller/prescriptionController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(authMiddleware);
router.post("/analyze-prescription", upload.single("file"), analyzePrescription);

export default router;
