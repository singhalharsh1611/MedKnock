import mongoose from "mongoose";
import DoseLog from "../models/doseLogModel.js";
import Schedule from "../models/scheduleModel.js";

// log dose as taken
export const logDoseAsTaken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { scheduleId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule id" });
    }

    const schedule = await Schedule.findOne({ _id: scheduleId, userId });
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });

    // check if already logged within 2h window
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existing = await DoseLog.findOne({
      scheduleId,
      userId,
      status: "taken",
      timestamp: { $gte: twoHoursAgo }
    });

    if (existing) {
      return res.status(400).json({ message: "Dose already marked as taken in the last 2 hours" });
    }

    const log = await DoseLog.create({
      scheduleId,
      userId,
      status: "taken"
    });

    return res.status(201).json(log);
  } catch (err) {
    return next(err);
  }
};