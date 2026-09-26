import { DoseLogService } from "../services/doseLogService.js";

export const logDoseAsTaken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await DoseLogService.logDoseAsTaken(userId, req.params.scheduleId);
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === "Invalid schedule id" || err.message.includes("Cannot log dose") || err.message.includes("already marked")) {
      return res.status(400).json({ message: err.message, existing: err.existing });
    }
    if (err.message === "Schedule not found") {
      return res.status(404).json({ message: err.message });
    }
    return next(err);
  }
};

export const getLast7DaysDoseLogs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const formattedLogs = await DoseLogService.getLast7DaysDoseLogs(userId);

    if (!formattedLogs.length) {
      return res.status(200).json({ message: "No logs found for the last 7 days", data: [] });
    }

    return res.status(200).json({
      message: "Last 7 days dose logs fetched successfully",
      count: formattedLogs.length,
      data: formattedLogs,
    });
  } catch (err) {
    return next(err);
  }
};
