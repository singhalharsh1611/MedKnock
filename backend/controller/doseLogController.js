import mongoose from "mongoose";
import DoseLog from "../models/doseLogModel.js";
import Schedule from "../models/scheduleModel.js";
import User from "../models/userModel.js";

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

    const now = new Date();

    const validTimes = schedule.times.map(timeStr => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    });

    // find the current time slot (within ±1 hour)
    const currentSlot = validTimes.find(t => Math.abs(t.getTime() - now.getTime()) <= 60 * 60 * 1000);

    if (!currentSlot) {
      return res.status(400).json({ message: "Cannot log dose outside the allowed time frame" });
    }
    const existing = await DoseLog.findOne({
      scheduleId,
      userId,
      status: "taken",
      timestamp: { 
        $gte: new Date(currentSlot.getTime() - 60 * 60 * 1000),
        $lte: new Date(currentSlot.getTime() + 60 * 60 * 1000)
      }
    });

    if (existing) {
      return res.status(400).json({ message: "Dose already marked as taken for this time" ,existing});
    }

    //  Log the dose
    const log = await DoseLog.create({
      scheduleId,
      userId,
      status: "taken",
      timestamp: now
    });

    //  Reduce medicine quantity
    if (schedule.quantity > 0) {
      schedule.quantity -= 1;
      await schedule.save();
    }

    //  Get today's boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    //  Check if user completed ALL doses for today
    const allSchedules = await Schedule.find({ userId, isActive: true });
    let totalDosesToday = 0;
    let takenDosesToday = 0;

    for (const sch of allSchedules) {
      totalDosesToday += sch.times.length;
      const takenCount = await DoseLog.countDocuments({
        scheduleId: sch._id,
        userId,
        status: "taken",
        timestamp: { $gte: todayStart, $lte: todayEnd }
      });
      takenDosesToday += takenCount;
    }

    const user = await User.findById(userId);

    // ✅ Only update streak if all doses for the day are complete
    if (totalDosesToday > 0 && takenDosesToday === totalDosesToday) {
      const lastDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
      const yesterday = new Date(todayStart);
      yesterday.setDate(todayStart.getDate() - 1);

      if (lastDate && lastDate.getTime() === yesterday.getTime()) {
        user.currentStreak += 1; // continue streak
      } else {
        user.currentStreak = 1; // new streak
      }

      user.lastStreakDate = todayStart;
      await user.save();
    }

    return res.status(201).json({
      log,
      quantity: schedule.quantity,
      streak: user.currentStreak,
      message:
        takenDosesToday === totalDosesToday
          ? "All doses for today taken — streak updated!"
          : "Dose logged successfully"
    });
  } catch (err) {
    return next(err);
  }
};
