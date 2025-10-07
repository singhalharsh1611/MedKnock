import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getDaily, getMedicationStats, getOverview, getStreak, getUpcoming } from '../controller/statsController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/daily', getDaily);
router.get('/medications', getMedicationStats);
router.get('/streak', getStreak);
router.get('/upcoming', getUpcoming);

export default router;
