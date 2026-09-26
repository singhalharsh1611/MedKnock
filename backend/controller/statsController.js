import { StatsService } from "../services/statsService.js";

export const getOverview = async (req, res, next) => {
  try {
    const data = await StatsService.getOverview(req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getDaily = async (req, res, next) => {
  try {
    const data = await StatsService.getDaily(req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getMedicationStats = async (req, res, next) => {
  try {
    const data = await StatsService.getMedicationStats(req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStreak = async (req, res, next) => {
  try {
    const data = await StatsService.getStreak(req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getUpcoming = async (req, res, next) => {
  try {
    const data = await StatsService.getUpcoming(req.user.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
