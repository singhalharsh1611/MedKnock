import express from "express";
import { webScraperController } from "../controller/webScraperController.js";

const router = express.Router();

router.get("/:medicineName", webScraperController);

export default router;
