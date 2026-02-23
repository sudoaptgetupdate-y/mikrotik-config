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
    const { name, circuitId, userId, configData } = req.body;
    if (!name || !userId) return res.status(400).json({ error: "Name and UserID are required" });

    // ✅ สร้าง Token ขึ้นมาเอง และทำการเข้ารหัสก่อนบันทึกลง Database
    const plainToken = crypto.randomUUID();
    const encryptedToken = encrypt(plainToken);

    const newDevice = await prisma.managedDevice.create({
      data: { 
        name, 
        circuitId, 
        userId: parseInt(userId), 
        configData: configData || {}, 
        status: "ACTIVE",
        apiToken: encryptedToken // 🔒 เก็บ Token ลง DB แบบเข้ารหัสแล้ว
      }
    });

    let finalConfigData = configData;
    if (configData) {
      // เอา Token ฉบับอ่านออก (Plaintext) แปะกลับไปให้ Frontend เอาไปสร้าง Script
      finalConfigData = { ...configData, token: plainToken };
      
      await prisma.managedDevice.update({
        where: { id: newDevice.id },
        data: { configData: finalConfigData }
      });
      await saveConfigHistory(userId, name, finalConfigData, newDevice.id);
    }

    await prisma.activityLog.create({
      data: { userId: parseInt(userId), action: "CREATE_DEVICE", details: `Created device: ${name}` }
    });

    // ส่งคืน Plaintext กลับไปที่ Frontend
    res.status(201).json({ ...newDevice, apiToken: plainToken, configData: finalConfigData });
  } catch (error) {
    console.error("Create device error:", error.message); // 🛡️ ป้องกัน Stack Trace หลุด
    res.status(500).json({ error: "Failed to create device" });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { configData, name, circuitId, status } = req.body; 

    const oldDevice = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!oldDevice) return res.status(404).json({ error: "Device not found" });

    const plainToken = decrypt(oldDevice.apiToken); // 🔓 ถอดรหัส Token เก่าจาก DB

    let finalConfigData = configData;
    if (configData) {
        finalConfigData = { ...configData, token: plainToken }; // แปะ Token เข้าไปใน Config ที่อัปเดตใหม่
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
      await saveConfigHistory(updatedDevice.userId, updatedDevice.name, finalConfigData, updatedDevice.id);
    }

    await prisma.activityLog.create({
      data: { userId: updatedDevice.userId, action: "UPDATE_DEVICE", details: `Updated config for device: ${updatedDevice.name}` }
    });

    res.json({ ...updatedDevice, apiToken: plainToken, configData: finalConfigData });
  } catch (error) {
    console.error("Update device error:", error.message);
    res.status(500).json({ error: "Failed to update device configuration" });
  }
};

exports.handleHeartbeat = async (req, res) => {
  try {
    const device = req.device; 
    const remoteIp = req.ip;
    const { cpu, ram, uptime, version, storage, temp, latency, boardName } = req.body; 

    const isHighLoad = (cpu && parseInt(cpu) > 85) || (ram && parseInt(ram) > 85);
    let resetAckData = {};
    if (!isHighLoad) {
      resetAckData = {
        isAcknowledged: false,
        ackReason: null,
        ackByUserId: null,
        ackAt: null
      };
    }

    await prisma.managedDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        currentIp: remoteIp,
        cpuLoad: cpu ? parseInt(cpu) : undefined,
        memoryUsage: ram ? parseInt(ram) : undefined,
        uptime: uptime || undefined,
        version: version || undefined,
        boardName: boardName || undefined, 
        storage: storage ? parseInt(storage) : undefined,
        temp: temp || undefined,
        latency: latency || undefined,
        status: device.status === 'DELETED' ? 'DELETED' : "ACTIVE",
        ...resetAckData 
      }
    });

    let commandToSend = "none";
    if (device.pendingCmd) {
      commandToSend = device.pendingCmd;
      await prisma.managedDevice.update({ where: { id: device.id }, data: { pendingCmd: null } });
      await prisma.activityLog.create({
        data: { userId: device.userId, action: "UPDATE_DEVICE", details: `Executed remote command on ${device.name}` }
      });
    }

    res.json({ status: "ok", command: commandToSend });
  } catch (error) {
    console.error("Heartbeat process error:", error.message);
    res.status(500).json({ error: "Heartbeat process failed" });
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
          apiToken: decrypt(d.apiToken) // 🔓 ถอดรหัสส่งคืนให้หน้าเว็บเอาไปโชว์
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

    device.apiToken = decrypt(device.apiToken); // 🔓 ถอดรหัสส่งให้หน้าเว็บ
    
    if (device.configData) {
      if (device.configData.selectedModel) device.model = device.configData.selectedModel;
      device.configData.token = device.apiToken; // แปะ Token ไปใน configData ไว้สร้าง Script
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
    const { userId, configId } = req.body; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
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
    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: { status: 'DELETED' }
    });

    await prisma.activityLog.create({
      data: {
        userId: device.userId,
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
    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: { status: 'ACTIVE' }
    });

    await prisma.activityLog.create({
      data: {
        userId: device.userId,
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
    const { userId, userName, reason } = req.body; 

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
      userId: parseInt(userId),
      userName: userName || "Unknown User" 
    });

    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        isAcknowledged: true,
        ackReason: ackHistory, 
        ackByUserId: parseInt(userId),
        ackAt: new Date()
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
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