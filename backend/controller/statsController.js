import prisma from "../config/prismaClient.js";

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
  const userId = req.user.id || req.user._id;
  const { start, end } = parseRange(req);

  const rows = await prisma.doseLog.groupBy({
    by: ['status'],
    where: {
      userId,
      timestamp: { gte: start, lte: end },
    },
    _count: {
      status: true,
    },
  });

  const totals = { taken: 0, missed: 0 };
  rows.forEach((r) => {
    if (r.status === 'taken') totals.taken = r._count.status;
    else if (r.status === 'missed') totals.missed = r._count.status;
  });

  const total = totals.taken + totals.missed;
  const adherence = total === 0 ? null : (totals.taken / total) * 100;

  res.json({ totals, total, adherence });
};

// 2) Daily time series
export const getDaily = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { start, end, tz } = parseRange(req);

  const logs = await prisma.doseLog.findMany({
    where: {
      userId,
      timestamp: { gte: start, lte: end },
    },
    select: {
      timestamp: true,
      status: true,
    }
  });

  const map = new Map();
  logs.forEach(log => {
    const day = toDateKeyISO(log.timestamp, tz);
    if (!map.has(day)) map.set(day, { taken: 0, missed: 0 });
    if (log.status === 'taken') map.get(day).taken++;
    if (log.status === 'missed') map.get(day).missed++;
  });

  const days = [];
  let cur = new Date(start);
  while (cur <= end) {
    days.push(toDateKeyISO(cur, tz));
    cur.setDate(cur.getDate() + 1);
  }

  const series = days.map((day) => ({
    date: day,
    taken: map.get(day)?.taken || 0,
    missed: map.get(day)?.missed || 0,
  }));

  res.json({ series });
};

// 3) Per medication stats (taken/missed per pillName)
export const getMedicationStats = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { start, end } = parseRange(req);

  const logs = await prisma.doseLog.findMany({
    where: {
      userId,
      timestamp: { gte: start, lte: end },
    },
    include: {
      schedule: true,
    }
  });

  const medMap = new Map();
  logs.forEach(log => {
    const pillName = log.schedule?.pillName || 'Unknown';
    if (!medMap.has(pillName)) medMap.set(pillName, { _id: pillName, taken: 0, missed: 0 });
    if (log.status === 'taken') medMap.get(pillName).taken++;
    if (log.status === 'missed') medMap.get(pillName).missed++;
  });

  const rows = Array.from(medMap.values()).sort((a, b) => b.missed - a.missed);
  res.json({ meds: rows });
};

// 4) Current streak (consecutive days with >=1 'taken', backward from today)
export const getStreak = async (req, res) => {
  const userId = req.user.id || req.user._id;
  const tz = req.query.tz || 'Asia/Kolkata';

  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const docs = await prisma.doseLog.findMany({
    where: {
      userId,
      status: 'taken',
      timestamp: { gte: cutoff },
    },
    select: {
      timestamp: true,
    }
  });

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
  const userId = req.user.id || req.user._id;
  const windowHours = Number(req.query.windowHours || 6);
  const tz = req.query.tz || 'Asia/Kolkata';

  const now = new Date();
  const schedules = await prisma.schedule.findMany({
    where: {
      userId,
      isActive: true,
    }
  });

  const upcoming = [];
  for (const s of schedules) {
    (s.times || []).forEach((timeStr) => {
      const [hh, mm] = timeStr.split(':').map(Number);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

      if (today >= now && today - now <= windowHours * 3600 * 1000) {
        upcoming.push({
          scheduleId: s.id || s._id,
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
