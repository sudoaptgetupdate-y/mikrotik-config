const modelService = require('../services/modelService');

exports.getModels = async (req, res) => {
  const models = await modelService.getModels(req.query.showDeleted === 'true');
  res.json(models);
};

exports.createModel = async (req, res) => {
  const { name, imageUrl, ports } = req.body;
  const newModel = await modelService.createModel(name, imageUrl, ports, req.user.id);
  res.status(201).json(newModel);
};

exports.deleteModel = async (req, res) => {
  const result = await modelService.deleteModel(req.params.id, req.user.id);
  res.json({ success: true, message: result.message });
};

exports.restoreModel = async (req, res) => {
  await modelService.restoreModel(req.params.id, req.user.id);
  res.json({ success: true, message: "Model restored successfully" });
};

exports.updateModel = async (req, res) => {
  const { name, imageUrl, ports } = req.body;
  const updatedModel = await modelService.updateModel(req.params.id, name, imageUrl, ports, req.user.id);
  res.json(updatedModel);
};