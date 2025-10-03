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
    const { pillName, dosage, times, riskScore, quantity, startDate } = req.body;

    // Authentication check
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Validation
    if (!pillName || !pillName.trim()) {
      return res.status(400).json({ message: 'pillName is required' });
    }

    const timesArr = normalizeTimes(times);
    if (!timesArr || timesArr.length === 0) {
      return res.status(400).json({ message: 'times must be a non-empty array of strings like "07:30"' });
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

    return res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
};