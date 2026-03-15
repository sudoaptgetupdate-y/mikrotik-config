const logService = require('../services/logService');

exports.getActivityLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const { startDate, endDate } = req.query;

  // โยนไปให้ Service จัดการเลย ไม่ต้องครอบด้วย try-catch แล้ว
  const result = await logService.getActivityLogs(page, limit, search, startDate, endDate);
  
  res.json(result);
};

exports.getEventSummary = async (req, res) => {
  const days = parseInt(req.query.days) || 1;
  const result = await logService.getEventSummary(days);
  res.json(result);
};

exports.getTopTroubleDevices = async (req, res) => {
  const days = parseInt(req.query.days) || 1;
  const result = await logService.getTopTroubleDevices(days);
  res.json(result);
};