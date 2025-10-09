
import mongoose from 'mongoose';
import DoseLog from '../models/doseLogModel.js';
import Schedule from '../models/scheduleModel.js';

// Helper: parse date-range query and timezone
const parseRange = (req) => {
  const tz = req.query.tz || 'Asia/Kolkata'; // default timezone
  const end = req.query.end ? new Date(req.query.end) : new Date();
  const start = req.query.start
    ? new Date(req.query.start)
    : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // default 30 days
  return { start, end, tz };
};

const toDateKeyISO = (date, tz = 'Asia/Kolkata') =>
  new Date(date).toLocaleDateString('en-CA', { timeZone: tz });




// 1) Overview: total taken / missed / adherence
export const getOverview = async (req, res) => {


const userId = new mongoose.Types.ObjectId(req.user._id || req.user.id);

  const { start, end } = parseRange(req);

  const match = {
    userId,
    timestamp: { $gte: start, $lte: end },
  };

  const agg = [
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ];

  const rows = await DoseLog.aggregate(agg);
  const totals = { taken: 0, missed: 0 };
  rows.forEach((r) => {
    if (r._id === 'taken') totals.taken = r.count;
    else if (r._id === 'missed') totals.missed = r.count;
  });

  const total = totals.taken + totals.missed;
  const adherence = total === 0 ? null : (totals.taken / total) * 100;

  res.json({ totals, total, adherence });
};

// 2) Daily time series
export const getDaily = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const { start, end, tz } = parseRange(req);

  const agg = [
    { $match: { userId, timestamp: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp'},
        },
        taken: { $sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const rows = await DoseLog.aggregate(agg);

  // Fill missing days with 0 values
  const days = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(toDateKeyISO(cur, tz));
    cur.setDate(cur.getDate() + 1);
  }

  const map = new Map(rows.map((r) => [r._id, r]));
  const series = days.map((day) => ({
    date: day,
    taken: map.get(day)?.taken || 0,
    missed: map.get(day)?.missed || 0,
  }));

  res.json({ series });
};

// 3) Per medication stats (taken/missed per pillName)
export const getMedicationStats = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const { start, end } = parseRange(req);

  const agg = [
    { $match: { userId, timestamp: { $gte: start, $lte: end } } },
    {
      $lookup: {
        from: 'schedules',
        localField: 'scheduleId',
        foreignField: '_id',
        as: 'schedule',
      },
    },
    { $unwind: '$schedule' },
    {
      $group: {
        _id: '$schedule.pillName',
        taken: { $sum: { $cond: [{ $eq: ['$status', 'taken'] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
      },
    },
    { $sort: { missed: -1 } },
  ];

  const rows = await DoseLog.aggregate(agg);
  res.json({ meds: rows });
};

// 4) Current streak (consecutive days with >=1 'taken', backward from today)
export const getStreak = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const tz = req.query.tz || 'Asia/Kolkata';

  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const docs = await DoseLog.find(
    { userId, status: 'taken', timestamp: { $gte: cutoff } },
    { timestamp: 1 }
  ).lean();

  const takenDays = new Set(docs.map((d) => toDateKeyISO(d.timestamp, tz)));

  let streak = 0;
  let cursor = new Date();
  while (takenDays.has(toDateKeyISO(cursor, tz))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  res.json({ streakDays: streak });
};

// 5) Upcoming scheduled doses in next N hours
export const getUpcoming = async (req, res) => {
  const userId = req.user.id;
  const windowHours = Number(req.query.windowHours || 6);
  const tz = req.query.tz || 'Asia/Kolkata';

  const now = new Date();
  const schedules = await Schedule.find({ userId, isActive: true }).lean();

  const upcoming = [];
  for (const s of schedules) {
    (s.times || []).forEach((timeStr) => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

      if (today >= now && today - now <= windowHours * 3600 * 1000) {
        upcoming.push({
          scheduleId: s._id,
          pillName: s.pillName,
          time: timeStr,
          at: today.toISOString(),
        });
      }
    });
  }

  upcoming.sort((a, b) => new Date(a.at) - new Date(b.at));
  res.json({ upcoming });
};
