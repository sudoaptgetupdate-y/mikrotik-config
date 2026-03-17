const deviceService = require('../services/deviceService');
const heartbeatService = require('../services/heartbeatService');
const maintenanceService = require('../services/maintenanceService');
const logService = require('../services/logService');

// ==========================================
// CRUD Devices
// ==========================================
exports.createDevice = async (req, res, next) => {
  try {
    const { name, circuitId, configData, groupIds } = req.body; // ✅ เพิ่ม groupIds
    const result = await deviceService.createDevice(name, circuitId, groupIds, configData, req.user.id);

    await logService.createActivityLog({
      userId: req.user.id,
      action: 'CREATE_DEVICE',
      details: `เพิ่มอุปกรณ์ใหม่: ${name} (Circuit: ${circuitId || 'N/A'})`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) { next(error); }
};

// ในฟังก์ชัน updateDevice
exports.updateDevice = async (req, res, next) => {
  try {
    const { name, circuitId, status, configData, groupIds } = req.body; // ✅ เพิ่ม groupIds
    const result = await deviceService.updateDevice(req.params.id, name, circuitId, groupIds, status, configData, req.user.id);

    await logService.createActivityLog({
      userId: req.user.id,
      action: 'UPDATE_DEVICE',
      details: `แก้ไขข้อมูลอุปกรณ์: ${name}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
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
  const device = await deviceService.getDeviceById(req.params.id);
  await deviceService.deleteDevice(req.params.id, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_DEVICE',
    details: `เปลี่ยนสถานะอุปกรณ์เป็น INACTIVE: ${device.name}`,
    ipAddress: req.ip
  });

  res.json({ message: "Device marked as inactive" });
};

exports.hardDeleteDevice = async (req, res) => {
  const device = await deviceService.getDeviceById(req.params.id);
  await deviceService.hardDeleteDevice(req.params.id, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'DELETE_DEVICE',
    details: `ลบอุปกรณ์ถาวรออกจากระบบ: ${device.name}`,
    ipAddress: req.ip
  });

  res.json({ message: "Device permanently deleted" });
};

exports.restoreDevice = async (req, res) => {
  const device = await deviceService.getDeviceById(req.params.id);
  await deviceService.restoreDevice(req.params.id, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_DEVICE',
    details: `กู้คืนสถานะอุปกรณ์: ${device.name}`,
    ipAddress: req.ip
  });

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
  
  await logService.createActivityLog({
    userId: req.user.id,
    action: 'ACKNOWLEDGE_DEVICE',
    details: `Acknowledge ปัญหาอุปกรณ์ ${device.name}: ${reason}`,
    ipAddress: req.ip
  });

  res.json({ message: "Warning acknowledged successfully", device });
};

// ==========================================
// Maintenance (Clear Logs)
// ==========================================
exports.clearAckHistory = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const affected = await maintenanceService.clearAckHistory(req.body.days, req.user.id);
  
  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_SETTING',
    details: `ล้างประวัติการ Acknowledge ย้อนหลังเกิน ${req.body.days} วัน`,
    ipAddress: req.ip
  });

  res.json({ message: `Cleared history older than ${req.body.days} days`, affectedDevices: affected });
};

exports.clearEventHistory = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const deletedCount = await maintenanceService.clearEventHistory(req.body.days, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_SETTING',
    details: `ล้างประวัติเหตุการณ์อุปกรณ์ (Event Log) ย้อนหลังเกิน ${req.body.days} วัน`,
    ipAddress: req.ip
  });

  res.json({ message: `Cleared event history older than ${req.body.days} days`, deletedCount });
};

exports.clearActivityLog = async (req, res) => {
  if (!req.body.days || isNaN(req.body.days)) throw new Error("BAD_REQUEST: Invalid days parameter");
  const deletedCount = await maintenanceService.clearActivityLog(req.body.days, req.user.id);

  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_SETTING',
    details: `ล้างประวัติกิจกรรมผู้ใช้งาน (Activity Log) ย้อนหลังเกิน ${req.body.days} วัน`,
    ipAddress: req.ip
  });

  res.json({ message: `Cleared activity logs older than ${req.body.days} days`, deletedCount });
};