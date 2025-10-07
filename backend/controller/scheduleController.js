import mongoose from 'mongoose';
import Schedule from '../models/scheduleModel.js';
import DoseLog from '../models/doseLogModel.js';
import User from '../models/userModel.js';


// safely parse and validate time strings array
const normalizeTimes = (times) => {
  if (!Array.isArray(times)) return [];
  return times
    .map(t => String(t).trim())
    .filter(t => t.length > 0);
};

const getTimeForToday = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
};


// create new schedule

export const createSchedule = async (req, res, next) => {
  try {
    console.log('req.user at createSchedule:', req.user);
    const userId = req.user?.id; // set by auth middleware
    const { pillName, dosage, times, riskScore, quantity, startDate } = req.body;

    // Authentication check
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Validation
    if (!pillName || !pillName.trim()) {
      return res.status(400).json({ message: 'pillName is required' });
    }

    const timesArr = normalizeTimes(times);
    if (!timesArr || timesArr.length === 0) {
      return res.status(400).json({ message: 'Times must be a non-empty array of strings like "07:30"' });
    }

    //CHECK IF  already exist
    const exist = await Schedule.findOne({ pillName, userId });
    if (exist) {
      return res.status(201).json({ success: false, message: 'Schedule already exist' });
    }
    // Create schedule
    const schedule = await Schedule.create({
      userId,
      pillName: pillName.trim(),
      dosage: dosage?.trim() ?? '',
      times: timesArr,
      riskScore: typeof riskScore === 'number' ? riskScore : 0, // default 0
      quantity: typeof quantity === 'number' ? quantity : 0,       // default 0
      startDate: startDate ? new Date(startDate) : undefined      // uses default in schema if undefined
    });

    return res.status(201).json(schedule);

  } catch (err) {
    return next(err);
  }
};


// GET /api/schedules
export const getSchedules = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    //get user's streak
    const user = await User.findById(userId).select('currentStreak');

    const schedules = await Schedule.find({ userId }).sort({ createdAt: -1 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    //counters for stats
    let totalDosesToday = 0;
    let takenDosesToday = 0;

    const now = new Date();
    const items = [];

    for (const schedule of schedules) {
      if(schedule.isActive){
        totalDosesToday += schedule.times.length;
      
      const takenCountForSchedule = await DoseLog.countDocuments({// counting log that has already taken
        scheduleId: schedule._id,
        userId,
        status: "taken",
        timestamp: { $gte: todayStart, $lte: todayEnd },
      })
      takenDosesToday += takenCountForSchedule;
    }
      // Compute today’s dose times
      const timesToday = schedule.times.map(t => getTimeForToday(t));

      // Check if dose can be logged now (+-1hr)
      let canLog = false;
      const missedTimes = [];
      for (const doseTime of timesToday) {
        const windowStart = new Date(doseTime.getTime() - 60 * 60 * 1000);
        const windowEnd = new Date(doseTime.getTime() + 60 * 60 * 1000);
        const taken = await DoseLog.findOne({
          scheduleId: schedule._id,
          userId,
          timestamp: { $gte: windowStart, $lte: windowEnd },
          status: "taken",
        });
        const diff = Math.abs(doseTime.getTime() - now.getTime());
        if (!taken && diff <= 60 * 60 * 1000 && schedule.quantity > 0) {
          canLog = true;
        }
      }

      // mark missed doses older than 1h
      for (const doseTime of timesToday) {
        if (doseTime.getTime() + 1*60*60*1000 < now.getTime()) {
          const existing = await DoseLog.findOne({
            scheduleId: schedule._id,
            userId,
            timestamp: { $gte: doseTime, $lte: new Date(doseTime.getTime() + 2*60*60*1000) }
          });
          if (!existing) {
            await DoseLog.create({
              scheduleId: schedule._id,
              userId,
              status: "missed",
              timestamp: doseTime
            });
            const h = doseTime.getHours().toString().padStart(2, "0");
            const m = doseTime.getMinutes().toString().padStart(2, "0");
            missedTimes.push(`${h}:${m}`);
          }
          else if(existing.status==="missed"){
            const h = doseTime.getHours().toString().padStart(2, "0");
            const m = doseTime.getMinutes().toString().padStart(2, "0");
            missedTimes.push(`${h}:${m}`);
          }
        }
      }

      items.push({ ...schedule.toObject(), canLog, missedTimes });
    }

    return res.status(200).json({ items, total: items.length, stats: { totalDosesToday, takenDosesToday }, currentStreak: user?.currentStreak || 0 });
  
  } catch (err) {
    return next(err);
  }
};

// PUT /api/schedules/:id
export const updateScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid schedule id' });
    }

    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const { pillName, dosage, times, riskScore, quantity, startDate } = req.body;

    if (pillName !== undefined) schedule.pillName = String(pillName).trim();
    if (dosage !== undefined) schedule.dosage = String(dosage).trim();

    if (times !== undefined) {
      // 👇 normalize or fallback to array of strings
      const arr = Array.isArray(times) ? times.map(String) : [];
      if (arr.length === 0) {
        return res.status(400).json({ message: 'times must be a non-empty array' });
      }
      schedule.times = arr;
    }

    if (riskScore !== undefined) {
      if (typeof riskScore !== 'number') {
        return res.status(400).json({ message: 'riskScore must be a number' });
      }
      schedule.riskScore = riskScore;
    }

    if (quantity !== undefined) {
      if (isNaN(quantity)) {
        return res.status(400).json({ message: 'quantity must be a number' });
      }
      schedule.quantity = Number(quantity);
    }

    if (startDate !== undefined) {
      const parsedDate = new Date(startDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'startDate must be a valid date' });
      }
      schedule.startDate = parsedDate;
    }

    await schedule.save();
    return res.status(200).json(schedule);
  } catch (err) {
    return next(err);
  }
};


// DELETE /api/schedules/:id
export const deleteScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid schedule id' });
    }

    const deleted = await Schedule.findOneAndDelete({ _id: id, userId });
    if (!deleted) return res.status(404).json({ message: 'Schedule not found' });

    return res.status(200).json({ message: 'Deleted', id });
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/schedules/:id
export const getScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid schedule id' });
    }


    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    return res.status(200).json(schedule);
  } catch (err) {
    return next(err);
  }
};


// patch /api/schedule/:id/toogle

export const toggleScheduleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);

    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    // Toggle isActive
    schedule.isActive = !schedule.isActive;
    await schedule.save();

    const schedules = await Schedule.find({ userId: req.user.id }).sort({ createdAt: -1 });
 
    // console.log(schedules);
    return res.status(200).json({
      success: true,
      message: "Schedule toggled successfully",
      schedules, // full updated list
    });

  } catch (err) {
    next(err);
  }
};
