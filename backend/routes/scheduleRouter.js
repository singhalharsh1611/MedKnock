import express from "express";
import { createSchedule, deleteScheduleById, getSchedules, toggleScheduleActive, updateScheduleById } from '../controller/scheduleController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);               // all routes below require JWT

router.post('/', createSchedule);      // POST /api/schedules
router.get('/', getSchedules);         // GET  /api/schedules
router.put('/:id', updateScheduleById);// PUT  /api/schedules/:id
router.delete('/:id', deleteScheduleById); // DELETE /api/schedules/:id
router.patch('/:id/toggle-active', toggleScheduleActive); // patch /api/schedule/:id/toogle


// same auth is use in separate use
// router.post('/', authentication, createSchedule);
// router.get('/', authentication, getSchedules);
// router.put('/:id', authentication, updateScheduleById);
// router.delete('/:id', authentication, deleteScheduleById);


export default router;   