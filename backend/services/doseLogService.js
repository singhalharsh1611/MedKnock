import prisma from "../config/prismaClient.js";

export class DoseLogService {
  static async logDoseAsTaken(userId, scheduleId) {
    if (!scheduleId || scheduleId.length !== 24) {
      throw new Error("Invalid schedule id");
    }

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) throw new Error("Schedule not found");

    const now = new Date();
    const validTimes = schedule.times.map((timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    });

    const currentSlot = validTimes.find((t) => Math.abs(t.getTime() - now.getTime()) <= 60 * 60 * 1000);

    if (!currentSlot) {
      throw new Error("Cannot log dose outside the allowed time frame");
    }

    const existing = await prisma.doseLog.findFirst({
      where: {
        scheduleId,
        userId,
        status: "taken",
        timestamp: {
          gte: new Date(currentSlot.getTime() - 60 * 60 * 1000),
          lte: new Date(currentSlot.getTime() + 60 * 60 * 1000),
        },
      },
    });

    if (existing) {
      const err = new Error("Dose already marked as taken for this time");
      err.existing = existing;
      throw err;
    }

    const log = await prisma.doseLog.create({
      data: { scheduleId, userId, status: "taken", timestamp: now },
    });

    let newRiskScore = schedule.riskScore;
    if (newRiskScore > 0) newRiskScore = Math.max(0, newRiskScore - 1);

    let newQuantity = schedule.quantity;
    if (newQuantity > 0) newQuantity -= 1;

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { riskScore: newRiskScore, quantity: newQuantity },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const allSchedules = await prisma.schedule.findMany({
      where: { userId, isActive: true },
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
          timestamp: { gte: todayStart, lte: todayEnd },
        },
      });
      takenDosesToday += takenCount;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    let newStreak = user.currentStreak;

    if (totalDosesToday > 0 && takenDosesToday === totalDosesToday) {
      const lastDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
      const yesterday = new Date(todayStart);
      yesterday.setDate(todayStart.getDate() - 1);

      if (lastDate && lastDate.getTime() === yesterday.getTime()) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak: newStreak, lastStreakDate: todayStart },
      });
    }

    return {
      log,
      quantity: newQuantity,
      streak: newStreak,
      message: takenDosesToday === totalDosesToday ? "All doses for today taken — streak updated!" : "Dose logged successfully",
    };
  }

  static async getLast7DaysDoseLogs(userId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 5);

    const logs = await prisma.doseLog.findMany({
      where: { userId, timestamp: { gte: startDate, lte: endDate } },
      include: {
        schedule: { select: { pillName: true, dosage: true, times: true, quantity: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    const formattedLogs = logs
      .filter((log) => log.schedule?.pillName && log.schedule.pillName.trim() !== "")
      .map((log) => ({
        _id: log.id,
        medicineName: log.schedule?.pillName || "Unknown",
        dosage: log.schedule?.dosage || "",
        quantityRemaining: log.schedule?.quantity ?? null,
        status: log.status,
        timestamp: log.timestamp,
        time: new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        date: new Date(log.timestamp).toISOString().split("T")[0],
      }));

    return formattedLogs;
  }
}
