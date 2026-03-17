const modelService = require('../services/modelService');
const logService = require('../services/logService');

exports.getModels = async (req, res) => {
  const models = await modelService.getModels(req.query.showDeleted === 'true');
  res.json(models);
};

exports.createModel = async (req, res) => {
  const { name, imageUrl, ports } = req.body;
  const newModel = await modelService.createModel(name, imageUrl, ports, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'CREATE_MODEL',
    details: `สร้าง Device Model ใหม่: ${name}`,
    ipAddress: req.ip
  });

  res.status(201).json(newModel);
};

exports.deleteModel = async (req, res) => {
  const model = await modelService.getModelById(req.params.id);
  const result = await modelService.deleteModel(req.params.id, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_MODEL',
    details: `ลบ Device Model (Archive): ${model.name}`,
    ipAddress: req.ip
  });

  res.json({ success: true, message: result.message });
};

exports.restoreModel = async (req, res) => {
  const model = await modelService.getModelById(req.params.id);
  await modelService.restoreModel(req.params.id, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_MODEL',
    details: `กู้คืน Device Model: ${model.name}`,
    ipAddress: req.ip
  });

  res.json({ success: true, message: "Model restored successfully" });
};

exports.updateModel = async (req, res) => {
  const { name, imageUrl, ports } = req.body;
  const updatedModel = await modelService.updateModel(req.params.id, name, imageUrl, ports, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_MODEL',
    details: `แก้ไขข้อมูล Device Model: ${name}`,
    ipAddress: req.ip
  });

  res.json(updatedModel);
};