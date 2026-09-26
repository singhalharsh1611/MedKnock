import prisma from "../config/prismaClient.js";

// log dose as taken
export const logDoseAsTaken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { scheduleId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!scheduleId || scheduleId.length !== 24) {
      return res.status(400).json({ message: "Invalid schedule id" });
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: userId
      }
    });

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
    const existing = await prisma.doseLog.findFirst({
      where: {
        scheduleId: scheduleId,
        userId: userId,
        status: "taken",
        timestamp: {
          gte: new Date(currentSlot.getTime() - 60 * 60 * 1000),
          lte: new Date(currentSlot.getTime() + 60 * 60 * 1000)
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: "Dose already marked as taken for this time", existing });
    }

    //  Log the dose
    const log = await prisma.doseLog.create({
      data: {
        scheduleId,
        userId,
        status: "taken",
        timestamp: now
      }
    });

    // decrease risk score for positive reinforcement
    let newRiskScore = schedule.riskScore;
    if (newRiskScore > 0) {
      newRiskScore = Math.max(0, newRiskScore - 1);
    }

    // Reduce quantity
    //  Reduce medicine quantity
    let newQuantity = schedule.quantity;
    if (newQuantity > 0) {
      newQuantity -= 1;
    }
    
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        riskScore: newRiskScore,
        quantity: newQuantity
      }
    });

    //  Get today's boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    //  Check if user completed ALL doses for today
    const allSchedules = await prisma.schedule.findMany({
      where: { userId, isActive: true }
    });
    
    let totalDosesToday = 0;
    let takenDosesToday = 0;

    for (const sch of allSchedules) {
      totalDosesToday += sch.times.length;
      const takenCount = await prisma.doseLog.count({
        where: {
          scheduleId: sch.id,
          userId,
          status: "taken",
          timestamp: { gte: todayStart, lte: todayEnd }
        }
      });
      takenDosesToday += takenCount;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // ✅ Only update streak if all doses for the day are complete
    if (totalDosesToday > 0 && takenDosesToday === totalDosesToday) {
      const lastDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
      const yesterday = new Date(todayStart);
      yesterday.setDate(todayStart.getDate() - 1);

      let newStreak = user.currentStreak;
      if (lastDate && lastDate.getTime() === yesterday.getTime()) {
        newStreak += 1; // continue streak
      } else {
        newStreak = 1; // new streak
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          lastStreakDate: todayStart
        }
      });
      
      user.currentStreak = newStreak;
    }

    return res.status(201).json({
      log,
      quantity: newQuantity,
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


export const getLast7DaysDoseLogs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Calculate last 7 days range (including today)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 5);

    // Fetch dose logs from last 7 days
    
    const logs = await prisma.doseLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: {
        schedule: {
          select: {
            pillName: true,
            dosage: true,
            times: true,
            quantity: true,
          }
        }
      },
      orderBy: { timestamp: "desc" }
    });

    if (!logs.length)
      return res.status(200).json({ message: "No logs found for the last 7 days", data: [] });

    logs.filter(
      (log) => log.schedule?.pillName && log.schedule.pillName.trim() !== ""
    );
    
    // Format response
    const formattedLogs = logs.map((log) => ({
      _id: log.id,
      medicineName: log.schedule?.pillName || "Unknown",
      dosage: log.schedule?.dosage || "",
      quantityRemaining: log.schedule?.quantity ?? null,
      status: log.status,
      timestamp: log.timestamp,
      time: new Date(log.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: new Date(log.timestamp).toISOString().split("T")[0],
    }));

    return res.status(200).json({
      message: "Last 7 days dose logs fetched successfully",
      count: formattedLogs.length,
      data: formattedLogs,
    });
  } catch (err) {
    return next(err);
  }
};
