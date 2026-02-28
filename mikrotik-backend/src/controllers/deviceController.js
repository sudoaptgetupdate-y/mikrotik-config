const prisma = require('../config/prisma');
const crypto = require('crypto'); // ✅ สำหรับใช้สร้าง Token แบบ UUID
const { encrypt, decrypt } = require('../utils/cryptoUtil'); // ✅ นำเข้าฟังก์ชันเข้ารหัสและถอดรหัส

// Helper: บันทึก History ลงตาราง Config
const saveConfigHistory = async (userId, name, configData, managedDeviceId) => {
  if (configData && configData.selectedModel && configData.selectedModel.id) {
    try {
      await prisma.config.create({
        data: {
          projectName: name,
          inputData: JSON.stringify(configData), 
          generatedScript: "", 
          deviceModelId: parseInt(configData.selectedModel.id), 
          userId: parseInt(userId),
          managedDeviceId: parseInt(managedDeviceId) 
        }
      });
    } catch (err) {
      console.error("Error saving history:", err.message); // 🛡️ บันทึกแค่ข้อความ Error
    }
  }
};

exports.createDevice = async (req, res) => {
  try {
    const { name, circuitId, configData } = req.body; 
    const actionUserId = req.user.id; 

    if (!name || !actionUserId) return res.status(400).json({ error: "Name and UserID are required" });

    // ✅ สร้าง Token ขึ้นมาเอง และทำการเข้ารหัสก่อนบันทึกลง Database
    const plainToken = crypto.randomUUID();
    const encryptedToken = encrypt(plainToken);

    const newDevice = await prisma.managedDevice.create({
      data: { 
        name, 
        circuitId, 
        userId: actionUserId, 
        configData: configData || {}, 
        status: "ACTIVE",
        apiToken: encryptedToken 
      }
    });

    let finalConfigData = configData;
    if (configData) {
      finalConfigData = { ...configData, token: plainToken };
      
      await prisma.managedDevice.update({
        where: { id: newDevice.id },
        data: { configData: finalConfigData }
      });
      await saveConfigHistory(actionUserId, name, finalConfigData, newDevice.id);
    }

    await prisma.activityLog.create({
      data: { 
        userId: actionUserId, 
        action: "CREATE_DEVICE", 
        details: `Created device: ${name}` 
      }
    });

    res.status(201).json({ ...newDevice, apiToken: plainToken, configData: finalConfigData });
  } catch (error) {
    console.error("Create device error:", error.message); 
    res.status(500).json({ error: "Failed to create device" });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { configData, name, circuitId, status } = req.body; 
    const actionUserId = req.user.id; 

    const oldDevice = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!oldDevice) return res.status(404).json({ error: "Device not found" });

    const plainToken = decrypt(oldDevice.apiToken); 

    let finalConfigData = configData;
    if (configData) {
        finalConfigData = { ...configData, token: plainToken }; 
    }

    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        configData: finalConfigData || oldDevice.configData, 
        ...(name && { name }),           
        ...(circuitId && { circuitId }),
        ...(status && { status }) 
      }
    });

    if (finalConfigData) {
      await saveConfigHistory(actionUserId, updatedDevice.name, finalConfigData, updatedDevice.id);
    }

    await prisma.activityLog.create({
      data: { 
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Updated config for device: ${updatedDevice.name}` 
      }
    });

    res.json({ ...updatedDevice, apiToken: plainToken, configData: finalConfigData });
  } catch (error) {
    console.error("Update device error:", error.message);
    res.status(500).json({ error: "Failed to update device configuration" });
  }
};

exports.handleHeartbeat = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const { cpu, ram, storage, temp, latency, uptime, version } = req.body;
    const remoteIp = req.ip;

    // ==========================================
    // 🚨 ระบบค้นหา Device แบบถอดรหัส (รองรับทั้งเก่าและใหม่)
    // ==========================================
    // ดึงเฉพาะ id และ apiToken ของทุกอุปกรณ์มาเช็ก
    const allDevices = await prisma.managedDevice.findMany({
      select: { id: true, apiToken: true }
    });

    let matchedDeviceId = null;

    for (const d of allDevices) {
      // 1. ลองเทียบแบบ Plain Text เผื่อเป็นอุปกรณ์เก่าที่ยังไม่เข้ารหัส
      if (d.apiToken === token) {
        matchedDeviceId = d.id;
        break;
      }
      
      // 2. ลองถอดรหัสของตัวเครื่องใหม่ แล้วเทียบกับค่าที่ MikroTik ส่งมา
      try {
        if (decrypt(d.apiToken) === token) {
          matchedDeviceId = d.id;
          break;
        }
      } catch (err) {
        // ถ้าถอดรหัสไม่ได้ (อาจเป็น Plain Text เก่า) ให้ข้ามไป
      }
    }

    // ถ้าหาไม่เจอจริงๆ ค่อยเด้ง 404
    if (!matchedDeviceId) return res.status(404).json({ error: "Device not found" });

    // เมื่อเจอ ID ที่ถูกต้องแล้ว ค่อยดึงข้อมูลเต็มๆ ออกมาทำงานต่อ
    const device = await prisma.managedDevice.findUnique({ where: { id: matchedDeviceId } });

    // ==========================================
    // 🟢 🔴 🟠 ระบบตรวจจับการเปลี่ยนสถานะ (Event Detection)
    // ==========================================
    const isHighLoad = (cpu && parseInt(cpu) > 85) || (ram && parseInt(ram) > 85);
    const wasHighLoad = (device.cpuLoad && parseInt(device.cpuLoad) > 85) || (device.memoryUsage && parseInt(device.memoryUsage) > 85);
    
    let justCameOnline = false;
    if (device.lastSeen) {
      const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
      if (diffMinutes > 3) {
        justCameOnline = true;
        await prisma.deviceEventLog.create({
          data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online' }
        });
      }
    }

    if (isHighLoad && !wasHighLoad) {
      await prisma.deviceEventLog.create({
        data: { deviceId: device.id, eventType: 'WARNING', details: `High Load Detected - CPU: ${cpu}%, RAM: ${ram}%` }
      });
    }

    if (!isHighLoad && wasHighLoad && !justCameOnline) {
      await prisma.deviceEventLog.create({
        data: { deviceId: device.id, eventType: 'ONLINE', details: 'System load is back to normal' }
      });
    }

    // ==========================================
    // อัปเดตข้อมูลสถานะล่าสุดลง Database
    // ==========================================
    let resetAckData = {};
    if (!isHighLoad) {
      resetAckData = {
        isAcknowledged: false,
        ackByUserId: null,
        ackAt: null
      };
    }

    await prisma.managedDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        currentIp: remoteIp, 
        cpuLoad: cpu ? parseInt(cpu) : device.cpuLoad, 
        memoryUsage: ram ? parseInt(ram) : device.memoryUsage, 
        storage: storage ? parseInt(storage) : device.storage, 
        temp: temp || device.temp, 
        uptime: uptime || device.uptime,
        version: version || device.version, 
        latency: latency || device.latency,
        ...resetAckData
      }
    });

    res.json({ message: "Heartbeat received" });
  } catch (error) {
    console.error("Heartbeat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserDevices = async (req, res) => {
  try {
    const devices = await prisma.managedDevice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const result = devices.map(d => {
        const isOnline = d.lastSeen && (new Date() - new Date(d.lastSeen) < 5 * 60 * 1000);
        let modelObj = null;
        if (d.configData && d.configData.selectedModel) {
          modelObj = d.configData.selectedModel;
        }
        return { 
          ...d, 
          isOnline, 
          model: modelObj,
          apiToken: decrypt(d.apiToken) 
        };
    });

    res.json(result);
  } catch (error) {
    console.error("Fetch devices error:", error.message);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};

exports.getDeviceHistory = async (req, res) => {
  try {
    const { id } = req.params; 
    const history = await prisma.config.findMany({
      where: { managedDeviceId: parseInt(id) }, 
      include: {
        deviceModel: { select: { name: true, imageUrl: true } }, 
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 
    });
    res.json(history);
  } catch (error) {
    console.error("Fetch device history error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    device.apiToken = decrypt(device.apiToken); 
    
    if (device.configData) {
      if (device.configData.selectedModel) device.model = device.configData.selectedModel;
      device.configData.token = device.apiToken; 
    }

    res.json(device);
  } catch (error) {
    console.error("Fetch device detail error:", error.message);
    res.status(500).json({ error: "Failed to fetch device detail" });
  }
};

exports.logDownload = async (req, res) => {
  try {
    const { id } = req.params; 
    const { configId } = req.body; 
    const actionUserId = req.user.id; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.activityLog.create({
      data: {
        userId: actionUserId, 
        action: "GENERATE_CONFIG", 
        details: `Downloaded config for: ${device.name} ${configId ? `(History Version #${configId})` : '(Latest Version)'}`
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Log download error:", error.message);
    res.status(500).json({ error: "Failed to log download activity" });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const actionUserId = req.user.id; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: { status: 'DELETED' }
    });

    await prisma.activityLog.create({
      data: {
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Soft deleted device: ${device.name}`
      }
    });

    res.json({ message: "Device marked as inactive" });
  } catch (error) {
    console.error("Delete device error:", error.message);
    res.status(500).json({ error: "Failed to delete device" });
  }
};

exports.restoreDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const actionUserId = req.user.id; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: { status: 'ACTIVE' }
    });

    await prisma.activityLog.create({
      data: {
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Restored device: ${device.name}`
      }
    });

    res.json({ message: "Device restored successfully" });
  } catch (error) {
    console.error("Restore device error:", error.message);
    res.status(500).json({ error: "Failed to restore device" });
  }
};

exports.acknowledgeWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, warningData } = req.body;
    
    const actionUserId = req.user.id;
    const actionUserName = req.user.username; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    let ackHistory = [];
    if (device.ackReason) {
      if (Array.isArray(device.ackReason)) {
        ackHistory = device.ackReason; 
      } else if (typeof device.ackReason === 'string') {
        try { ackHistory = JSON.parse(device.ackReason); } catch(e) {}
      }
    }

    ackHistory.push({
      timestamp: new Date(),
      reason: reason,
      warningData: warningData || null,
      userId: actionUserId,
      userName: actionUserName || "Unknown User" 
    });

    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        isAcknowledged: true,
        ackReason: ackHistory, 
        ackByUserId: actionUserId,
        ackAt: new Date()
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Acknowledged update on: ${device.name}. Reason: ${reason}`
      }
    });

    res.json({ message: "Warning acknowledged successfully", device: updatedDevice });
  } catch (error) {
    console.error("Acknowledge warning error:", error.message);
    res.status(500).json({ error: "Failed to acknowledge warning" });
  }
};

// ==========================================
// ลบประวัติ Acknowledge เก่า
// ==========================================
exports.clearAckHistory = async (req, res) => {
  try {
    const { days } = req.body; 
    if (!days || isNaN(days)) return res.status(400).json({ error: "Invalid days parameter" });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const devices = await prisma.managedDevice.findMany({
      where: { ackReason: { not: null } }
    });

    let updatedCount = 0;

    for (const device of devices) {
      let history = [];
      if (typeof device.ackReason === 'string') {
         try { history = JSON.parse(device.ackReason); } catch(e) {}
      } else if (Array.isArray(device.ackReason)) {
         history = device.ackReason;
      }

      if (history.length > 0) {
         const filteredHistory = history.filter(h => new Date(h.timestamp) >= cutoffDate);
         
         if (filteredHistory.length !== history.length) {
            await prisma.managedDevice.update({
               where: { id: device.id },
               data: { ackReason: filteredHistory.length > 0 ? filteredHistory : null }
            });
            updatedCount++;
         }
      }
    }

    await prisma.activityLog.create({
       data: {
         userId: req.user.id,
         action: "UPDATE_DEVICE",
         details: `Cleared global acknowledge history older than ${days} days (Affected ${updatedCount} devices)`
       }
    });

    res.json({ message: `Cleared history older than ${days} days`, affectedDevices: updatedCount });
  } catch (error) {
    console.error("Clear Ack History Error:", error);
    res.status(500).json({ error: "Failed to clear history" });
  }
};

// ==========================================
// ดึงข้อมูล Event (Online/Offline/Warning)
// ==========================================
exports.getDeviceEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const events = await prisma.deviceEventLog.findMany({
      where: { deviceId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
      take: 100 
    });
    res.json(events);
  } catch (error) {
    console.error("Fetch Events Error:", error);
    res.status(500).json({ error: "Failed to fetch event logs" });
  }
};

// ==========================================
// ✅ เพิ่มแล้ว: ลบประวัติ Event (Online/Offline/Warning)
// ==========================================
exports.clearEventHistory = async (req, res) => {
  try {
    const { days } = req.body; 
    if (!days || isNaN(days)) return res.status(400).json({ error: "Invalid days parameter" });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await prisma.deviceEventLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    await prisma.activityLog.create({
       data: {
         userId: req.user.id,
         action: "UPDATE_DEVICE",
         details: `Cleared device event history older than ${days} days (Deleted ${result.count} records)`
       }
    });

    res.json({ message: `Cleared event history older than ${days} days`, deletedCount: result.count });
  } catch (error) {
    console.error("Clear Event History Error:", error);
    res.status(500).json({ error: "Failed to clear event history" });
  }
};

// ==========================================
// ลบประวัติ Activity Log (Audit Log)
// ==========================================
exports.clearActivityLog = async (req, res) => {
  try {
    const { days } = req.body; 
    if (!days || isNaN(days)) return res.status(400).json({ error: "Invalid days parameter" });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // ลบ Log ที่เก่ากว่าวันที่กำหนด
    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    // บันทึก Log ว่ามีการลบข้อมูล (Log ตัวนี้จะเพิ่งถูกสร้าง จึงไม่ถูกลบไปด้วย)
    await prisma.activityLog.create({
       data: {
         userId: req.user.id,
         action: "UPDATE_DEVICE", 
         details: `Cleared system activity (audit) logs older than ${days} days (Deleted ${result.count} records)`
       }
    });

    res.json({ message: `Cleared activity logs older than ${days} days`, deletedCount: result.count });
  } catch (error) {
    console.error("Clear Activity Log Error:", error);
    res.status(500).json({ error: "Failed to clear activity logs" });
  }
};