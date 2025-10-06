import express from "express";
import { saveFcmToken, testNotification } from "../controller/notificationsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post('/subscribe', saveFcmToken);
router.get('/test', testNotification);

export default router;  