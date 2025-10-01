import express from "express";
import { createSchedule, deleteScheduleById, getSchedules, updateScheduleById } from '../controller/scheduleController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);               // all routes below require JWT

router.post('/', createSchedule);      // POST /api/schedules
router.get('/', getSchedules);         // GET  /api/schedules
router.put('/:id', updateScheduleById);// PUT  /api/schedules/:id
router.delete('/:id', deleteScheduleById); // DELETE /api/schedules/:id

export default router;   