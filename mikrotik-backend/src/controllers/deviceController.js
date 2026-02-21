const prisma = require('../config/prisma');

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
      console.error("Error saving history:", err);
    }
  }
};

exports.createDevice = async (req, res) => {
  try {
    const { name, circuitId, userId, configData } = req.body;
    if (!name || !userId) return res.status(400).json({ error: "Name and UserID are required" });

    const newDevice = await prisma.managedDevice.create({
      data: { name, circuitId, userId: parseInt(userId), configData: configData || {}, status: "ACTIVE" }
    });

    let finalConfigData = configData;
    if (configData) {
      finalConfigData = { ...configData, token: newDevice.apiToken };
      await prisma.managedDevice.update({
        where: { id: newDevice.id },
        data: { configData: finalConfigData }
      });
      await saveConfigHistory(userId, name, finalConfigData, newDevice.id);
    }

    await prisma.activityLog.create({
      data: { userId: parseInt(userId), action: "CREATE_DEVICE", details: `Created device: ${name}` }
    });

    res.status(201).json({ ...newDevice, configData: finalConfigData });
  } catch (error) {
    res.status(500).json({ error: "Failed to create device" });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { configData, name, circuitId, status } = req.body; 

    const oldDevice = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!oldDevice) return res.status(404).json({ error: "Device not found" });

    let finalConfigData = configData;
    if (configData) {
        finalConfigData = { ...configData, token: oldDevice.apiToken };
    }

    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        configData: finalConfigData, 
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

    res.json(updatedDevice);
  } catch (error) {
    res.status(500).json({ error: "Failed to update device configuration" });
  }
};

exports.handleHeartbeat = async (req, res) => {
  try {
    const device = req.device; 
    const remoteIp = req.socket.remoteAddress || req.ip; 
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
    res.status(500).json({ error: "Heartbeat process failed" });
  }
};

// 4. ดึงรายการอุปกรณ์ (List) - ปรับให้อ่านได้ "ทั้งหมด" โดยไม่สน userId
exports.getUserDevices = async (req, res) => {
  try {
    // เอา userId ออก ไม่ต้องกรองแล้ว ดึงมาหมดเลย!
    const devices = await prisma.managedDevice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const result = devices.map(d => {
        const isOnline = d.lastSeen && (new Date() - new Date(d.lastSeen) < 5 * 60 * 1000);
        let modelObj = null;
        if (d.configData && d.configData.selectedModel) {
          modelObj = d.configData.selectedModel;
        }
        return { ...d, isOnline, model: modelObj };
    });

    res.json(result);
  } catch (error) {
    console.error("Fetch devices error:", error);
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
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });
    if (device.configData && device.configData.selectedModel) {
      device.model = device.configData.selectedModel;
    }
    res.json(device);
  } catch (error) {
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
    res.status(500).json({ error: "Failed to restore device" });
  }
};

// ✅ 10. Acknowledge Warning
exports.acknowledgeWarning = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ แก้ไขบรรทัดนี้: เพิ่ม userName เข้าไปในปีกกา เพื่อรับค่าจากหน้าเว็บ
    const { userId, userName, reason } = req.body; 

    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    // 1. เช็คว่าเป็น Array มาจาก DB อยู่แล้วหรือไม่
    let ackHistory = [];
    if (device.ackReason) {
      if (Array.isArray(device.ackReason)) {
        ackHistory = device.ackReason; 
      } else if (typeof device.ackReason === 'string') {
        try { ackHistory = JSON.parse(device.ackReason); } catch(e) {}
      }
    }

    // 2. เอาของใหม่ใส่ต่อท้าย Array
    ackHistory.push({
      timestamp: new Date(),
      reason: reason,
      userId: parseInt(userId),
      userName: userName || "Unknown User" // ตอนนี้ userName จะมีค่าแล้ว ไม่ error แน่นอนครับ
    });

    // 3. โยน Array กลับลง DB
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
    console.error("Acknowledge error:", error);
    res.status(500).json({ error: "Failed to acknowledge warning" });
  }
};