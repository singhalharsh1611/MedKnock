import prisma from "../config/prismaClient.js";
import { GoogleCalendarService } from "./googleCalendarService.js";

const normalizeTimes = (times) => {
  if (!Array.isArray(times)) return [];
  return times.map((t) => String(t).trim()).filter((t) => t.length > 0);
};

const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};

export class ScheduleService {
  static async createSchedule(userId, data) {
    const { pillName, dosage, times, riskScore, quantity, startDate } = data;
    
    if (!pillName || !pillName.trim()) throw new Error("pillName is required");

    const timesArr = normalizeTimes(times);
    if (!timesArr.length) throw new Error('Times must be like ["07:30", "12:00"]');

    const exist = await prisma.schedule.findFirst({ where: { pillName, userId } });
    if (exist) throw new Error("Schedule already exists");

    const schedule = await prisma.schedule.create({
      data: {
        userId,
        pillName: pillName.trim(),
        dosage: dosage?.trim() ?? "",
        times: timesArr,
        riskScore: Number.isFinite(riskScore) ? riskScore : 0,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        startDate: startDate ? new Date(startDate) : undefined,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.googleCalendarToken && user?.googleRefreshToken) {
      GoogleCalendarService.syncDosesToGoogleCalendar(user).catch(console.error);
    }
    return schedule;
  }

  static async getSchedules(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true } });
    const schedules = await prisma.schedule.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayLogs = await prisma.doseLog.findMany({
      where: { userId, timestamp: { gte: todayStart, lte: todayEnd } },
    });

    const logsBySchedule = {};
    for (const log of todayLogs) {
      if (!logsBySchedule[log.scheduleId]) logsBySchedule[log.scheduleId] = [];
      logsBySchedule[log.scheduleId].push(log);
    }

    let totalDosesToday = 0;
    let takenDosesToday = 0;
    const now = new Date();

    const items = schedules.map((schedule) => {
      const timesToday = schedule.times.map(getTimeForToday);
      const logs = logsBySchedule[schedule.id] || [];

      totalDosesToday += schedule.isActive ? schedule.times.length : 0;
      takenDosesToday += logs.filter((l) => l.status === "taken").length;

      const missedTimes = [];
      let canLog = false;

      for (const doseTime of timesToday) {
        const diff = Math.abs(now - doseTime);
        const alreadyTaken = logs.some(
          (l) => l.status === "taken" && Math.abs(l.timestamp.getTime() - doseTime.getTime()) <= 3600000
        );

        if (!alreadyTaken && diff <= 3600000 && schedule.quantity > 0) {
          canLog = true;
        } else if (!alreadyTaken && doseTime.getTime() + 3600000 < now.getTime()) {
          missedTimes.push(
            `${doseTime.getHours().toString().padStart(2, "0")}:${doseTime.getMinutes().toString().padStart(2, "0")}`
          );
        }
      }

      return { ...schedule, canLog, missedTimes };
    });

    return { items, total: items.length, stats: { totalDosesToday, takenDosesToday }, currentStreak: user?.currentStreak || 0 };
  }

  static async updateSchedule(userId, scheduleId, updateData) {
    const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, userId } });
    if (!schedule) throw new Error("Schedule not found");

    const data = {};
    if (updateData.pillName !== undefined) data.pillName = String(updateData.pillName).trim();
    if (updateData.dosage !== undefined) data.dosage = String(updateData.dosage).trim();
    if (Array.isArray(updateData.times) && updateData.times.length > 0) data.times = updateData.times.map(String);
    if (updateData.riskScore !== undefined && typeof updateData.riskScore === "number") data.riskScore = updateData.riskScore;
    if (updateData.quantity !== undefined && !isNaN(updateData.quantity)) data.quantity = Number(updateData.quantity);
    if (updateData.startDate !== undefined && !isNaN(new Date(updateData.startDate).getTime())) data.startDate = new Date(updateData.startDate);

    const updatedSchedule = await prisma.schedule.update({ where: { id: scheduleId }, data });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.googleCalendarToken && user?.googleRefreshToken) {
      GoogleCalendarService.syncDosesToGoogleCalendar(user).catch(console.error);
    }

    return updatedSchedule;
  }

  static async deleteSchedule(userId, scheduleId) {
    const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, userId } });
    if (!schedule) throw new Error("Not found");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.googleCalendarToken && user?.googleRefreshToken) {
      await GoogleCalendarService.deleteGoogleEventsForSchedule(user, schedule);
    }

    await prisma.schedule.delete({ where: { id: scheduleId } });
    return scheduleId;
  }

  static async toggleScheduleActive(userId, scheduleId) {
    const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, userId } });
    if (!schedule) throw new Error("Schedule not found");

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { isActive: !schedule.isActive },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.googleCalendarToken && user?.googleRefreshToken) {
      if (updatedSchedule.isActive) {
        GoogleCalendarService.syncDosesToGoogleCalendar(user).catch(console.error);
      } else {
        GoogleCalendarService.deleteGoogleEventsForSchedule(user, updatedSchedule).catch(console.error);
      }
    }

    return await prisma.schedule.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  static async getScheduleById(userId, scheduleId) {
    const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, userId } });
    if (!schedule) throw new Error("Schedule not found");
    return schedule;
  }
}
