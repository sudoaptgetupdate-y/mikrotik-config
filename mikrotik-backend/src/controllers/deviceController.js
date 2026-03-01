const deviceService = require('../services/deviceService');
const heartbeatService = require('../services/heartbeatService');
const maintenanceService = require('../services/maintenanceService');

// ==========================================
// CRUD Devices
// ==========================================
exports.createDevice = async (req, res) => {
  const { name, circuitId, configData } = req.body; 
  if (!name || !req.user.id) throw new Error("BAD_REQUEST: Name and UserID are required");

  const result = await deviceService.createDevice(name, circuitId, configData, req.user.id);
  res.status(201).json({ ...result.newDevice, apiToken: result.combinedToken, configData: result.finalConfigData });
};

exports.updateDevice = async (req, res) => {
  const { configData, name, circuitId, status } = req.body; 
  const result = await deviceService.updateDevice(req.params.id, name, circuitId, status, configData, req.user.id);
  res.json({ ...result.updatedDevice, apiToken: result.combinedToken, configData: result.finalConfigData });
};

exports.getUserDevices = async (req, res) => {
  const result = await deviceService.getUserDevices();
  res.json(result);
};

exports.getDeviceById = async (req, res) => {
  const device = await deviceService.getDeviceById(req.params.id);
  res.json(device);
};

exports.deleteDevice = async (req, res) => {
  await deviceService.deleteDevice(req.params.id, req.user.id);
  res.json({ message: "Device marked as inactive" });
};

exports.restoreDevice = async (req, res) => {
  await deviceService.restoreDevice(req.params.id, req.user.id);
  res.json({ message: "Device restored successfully" });
};

// ==========================================
// Heartbeat & Events
// ==========================================
exports.handleHeartbeat = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("UNAUTHORIZED: Unauthorized");
  const token = authHeader.split(" ")[1];

  await heartbeatService.processHeartbeat(token, req.body, req.ip);
  res.json({ message: "Heartbeat received" });
};

exports.getDeviceEvents = async (req, res) => {
  const events = await deviceService.getDeviceEvents(req.params.id);
  res.json(events);
};

// ==========================================
// History & Logs & Actions
// ==========================================
exports.getDeviceHistory = async (req, res) => {
  const history = await deviceService.getDeviceHistory(req.params.id);
  res.json(history);
};

exports.logDownload = async (req, res) => {
  await deviceService.logDownload(req.params.id, req.body.configId, req.user.id);
  res.json({ success: true });
};

exports.acknowledgeWarning = async (req, res) => {
  const { reason, warningData } = req.body;
  const device = await deviceService.acknowledgeWarning(req.params.id, reason, warningData, req.user.id, req.user.username);
  res.json({ message: "Warning acknowledged successfully", device });
};

// ==========================================
// Maintenance (Clear Logs)
// ==========================================
exports.clearAckHistory = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const affected = await maintenanceService.clearAckHistory(req.body.days, req.user.id);
  res.json({ message: `Cleared history older than ${req.body.days} days`, affectedDevices: affected });
};

exports.clearEventHistory = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const deletedCount = await maintenanceService.clearEventHistory(req.body.days, req.user.id);
  res.json({ message: `Cleared event history older than ${req.body.days} days`, deletedCount });
};

exports.clearActivityLog = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const deletedCount = await maintenanceService.clearActivityLog(req.body.days, req.user.id);
  res.json({ message: `Cleared activity logs older than ${req.body.days} days`, deletedCount });
};