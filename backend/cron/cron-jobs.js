import cron from "node-cron";
import Schedule from "../models/scheduleModel.js";
import DoseLog from "../models/doseLogModel.js";

// helper: convert "HH:mm" string to Date object for today
const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};

// every 10 minutes check missed doses
export const startCronJobs = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const schedules = await Schedule.find({});
      for (const schedule of schedules) {
        for (const time of schedule.times) {
          const doseTime = getTimeForToday(time);

          // If dose time passed more than 2h ago but today no log exists them mark the pill as missed
          if (doseTime <= twoHoursAgo) {
            const existing = await DoseLog.findOne({
              scheduleId: schedule._id,
              userId: schedule.userId,
              timestamp: {
                $gte: doseTime,
                $lte: new Date(doseTime.getTime() + 2 * 60 * 60 * 1000)
              }
            });

            if (!existing) {
              await DoseLog.create({
                scheduleId: schedule._id,
                userId: schedule.userId,
                status: "missed",
                timestamp: doseTime
              });
              console.log(`Marked missed dose for schedule ${schedule._id} at ${time}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
};
