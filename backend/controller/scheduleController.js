import mongoose from 'mongoose';
import Schedule from '../models/scheduleModel.js';

// safely parse and validate time strings array
const normalizeTimes = (times) => {
  if (!Array.isArray(times)) return [];
  return times
    .map(t => String(t).trim())
    .filter(t => t.length > 0);
};

// create new schedule
export const createSchedule = async (req, res, next) => {
  try {
    console.log('req.user at createSchedule:', req.user);
    const userId = req.user?.id; // set by auth middleware
    const { pillName, dosage, times, riskScore } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!pillName || !pillName.trim()) {
      return res.status(400).json({ message: 'pillName is required' });
    }

    const timesArr = normalizeTimes(times);
    if (timesArr.length === 0) {
      return res.status(400).json({ message: 'times must be a non-empty array of strings like "07:30"' });
    }

    const schedule = await Schedule.create({
      userId,
      pillName: pillName.trim(),
      dosage: dosage?.trim() ?? '',
      times: timesArr,
      riskScore: typeof riskScore === 'number' ? riskScore : undefined
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

    const { q, limit = 50, skip = 0 } = req.query;

    const filter = { userId };
    if (q) {
      filter.pillName = { $regex: String(q).trim(), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Schedule.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100)),
      Schedule.countDocuments(filter)
    ]);

    return res.status(200).json({ items, total });
  } catch (err) {
    return next(err);
  }
};

// PUT /api/schedules/:id
export const updateScheduleById = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid schedule id' });
    }

    const schedule = await Schedule.findOne({ _id: id, userId });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    const { pillName, dosage, times, riskScore } = req.body;

    if (pillName !== undefined) schedule.pillName = String(pillName).trim();
    if (dosage !== undefined) schedule.dosage = String(dosage).trim();
    if (times !== undefined) {
      const arr = normalizeTimes(times);
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