import { ScheduleService } from "../services/scheduleService.js";

// CREATE schedule
export const createSchedule = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await ScheduleService.createSchedule(userId, req.body);
    return res.status(201).json(schedule);
  } catch (err) {
    if (err.message === "Schedule already exists") {
      return res.status(201).json({ success: false, message: err.message });
    }
    if (err.message.includes("is required") || err.message.includes("Times must be like")) {
      return res.status(400).json({ message: err.message });
    }
    return next(err);
  }
};

// GET all schedules
export const getSchedules = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await ScheduleService.getSchedules(userId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// UPDATE schedule
export const updateScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const updatedSchedule = await ScheduleService.updateSchedule(userId, req.params.id, req.body);
    return res.status(200).json(updatedSchedule);
  } catch (err) {
    if (err.message === "Schedule not found") return res.status(404).json({ message: err.message });
    next(err);
  }
};

// DELETE schedule
export const deleteScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = await ScheduleService.deleteSchedule(userId, req.params.id);
    return res.status(200).json({ success: true, message: "Deleted", id });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ message: err.message });
    next(err);
  }
};

// TOGGLE active
export const toggleScheduleActive = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedules = await ScheduleService.toggleScheduleActive(userId, req.params.id);
    return res.status(200).json({ success: true, message: "Toggled", schedules });
  } catch (err) {
    if (err.message === "Schedule not found") return res.status(404).json({ message: err.message });
    next(err);
  }
};

// GET by ID
export const getScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const schedule = await ScheduleService.getScheduleById(userId, req.params.id);
    return res.status(200).json(schedule);
  } catch (err) {
    if (err.message === "Schedule not found") return res.status(404).json({ message: err.message });
    next(err);
  }
};
