import express from "express";
import { handleChat } from "../controller/chatbotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, handleChat);

export default router;