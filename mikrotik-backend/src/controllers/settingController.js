const settingService = require('../services/settingService');

exports.getSettings = async (req, res) => {
  const result = await settingService.getSettings(req.query.key);
  res.json(result);
};

exports.updateSetting = async (req, res) => {
  const { value, description } = req.body;
  const result = await settingService.updateSetting(req.params.key, value, description, req.user.id);
  res.json({ message: `${req.params.key} updated successfully`, data: result });
};