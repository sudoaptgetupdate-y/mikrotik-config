const deviceService = require('../services/deviceService');
const heartbeatService = require('../services/heartbeatService');
const maintenanceService = require('../services/maintenanceService');

/**
 * 🎯 [Slim Controller] จัดการ Request/Response สำหรับอุปกรณ์
 */

exports.checkDuplicate = async (req, res, next) => {
  try {
    const { name, circuitId, excludeId } = req.query;
    const result = await deviceService.checkDuplicate(name, circuitId, excludeId);
    res.json(result);
  } catch (error) { next(error); }
};

// ==========================================
// CRUD Devices
// ==========================================

exports.createDevice = async (req, res, next) => {
  try {
    const { name, circuitId, configData, groupIds } = req.body;
    const result = await deviceService.createDevice(name, circuitId, groupIds, configData, req.user.id, req.ip);
    res.status(201).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.updateDevice = async (req, res, next) => {
  try {
    const { name, circuitId, status, configData, groupIds } = req.body;
    const result = await deviceService.updateDevice(req.params.id, name, circuitId, groupIds, status, configData, req.user.id, req.ip);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

exports.getUserDevices = async (req, res, next) => {
  try {
    const result = await deviceService.getUserDevices();
    res.json(result);
  } catch (error) { next(error); }
};

exports.getDeviceById = async (req, res, next) => {
  try {
    const device = await deviceService.getDeviceById(req.params.id);
    res.json(device);
  } catch (error) { next(error); }
};

exports.deleteDevice = async (req, res, next) => {
  try {
    await deviceService.deleteDevice(req.params.id, req.user.id, req.ip);
    res.json({ message: "Device marked as inactive" });
  } catch (error) { next(error); }
};

exports.hardDeleteDevice = async (req, res, next) => {
  try {
    await deviceService.hardDeleteDevice(req.params.id, req.user.id, req.ip);
    res.json({ message: "Device permanently deleted" });
  } catch (error) { next(error); }
};

exports.restoreDevice = async (req, res, next) => {
  try {
    await deviceService.restoreDevice(req.params.id, req.user.id, req.ip);
    res.json({ message: "Device restored successfully" });
  } catch (error) { next(error); }
};

// ==========================================
// Heartbeat & Events
// ==========================================

exports.handleHeartbeat = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("UNAUTHORIZED: Unauthorized");
    const token = authHeader.split(" ")[1];

    await heartbeatService.processHeartbeat(token, req.body, req.ip);
    res.json({ message: "Heartbeat received" });
  } catch (error) { next(error); }
};

exports.getDeviceEvents = async (req, res, next) => {
  try {
    const events = await deviceService.getDeviceEvents(req.params.id);
    res.json(events);
  } catch (error) { next(error); }
};

// ==========================================
// History & Logs & Actions
// ==========================================

exports.getDeviceHistory = async (req, res, next) => {
  try {
    const history = await deviceService.getDeviceHistory(req.params.id);
    res.json(history);
  } catch (error) { next(error); }
};

exports.logDownload = async (req, res, next) => {
  try {
    await deviceService.logDownload(req.params.id, req.body.configId, req.user.id, req.ip);
    res.json({ success: true });
  } catch (error) { next(error); }
};

exports.acknowledgeWarning = async (req, res, next) => {
  try {
    const { reason, warningData } = req.body;
    const device = await deviceService.acknowledgeWarning(req.params.id, reason, warningData, req.user.id, req.user.username, req.ip);
    res.json({ message: "Warning acknowledged successfully", device });
  } catch (error) { next(error); }
};

// ==========================================
// Maintenance (Clear Logs)
// ==========================================

exports.clearAckHistory = async (req, res, next) => {
  try {
    if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
    const affected = await maintenanceService.clearAckHistory(req.body.days, req.user.id, req.ip);
    res.json({ message: `Cleared history older than ${req.body.days} days`, affectedDevices: affected });
  } catch (error) { next(error); }
};

exports.clearEventHistory = async (req, res, next) => {
  try {
    if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
    const deletedCount = await maintenanceService.clearEventHistory(req.body.days, req.user.id, req.ip);
    res.json({ message: `Cleared event history older than ${req.body.days} days`, deletedCount });
  } catch (error) { next(error); }
};

exports.clearActivityLog = async (req, res, next) => {
  try {
    if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
    const deletedCount = await maintenanceService.clearActivityLog(req.body.days, req.user.id, req.ip);
    res.json({ message: `Cleared activity logs older than ${req.body.days} days`, deletedCount });
  } catch (error) { next(error); }
};
