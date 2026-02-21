const prisma = require('../config/prisma');

// Helper: บันทึก History ลงตาราง Config
const saveConfigHistory = async (userId, name, configData, managedDeviceId) => {
  // เช็คว่ามีข้อมูล config และ model id หรือไม่
  if (configData && configData.selectedModel && configData.selectedModel.id) {
    try {
      await prisma.config.create({
        data: {
          projectName: name,
          inputData: JSON.stringify(configData), // เก็บ JSON Config (ที่มี Token แล้ว)
          generatedScript: "", // (อนาคตค่อยส่ง script มาเก็บ)
          deviceModelId: parseInt(configData.selectedModel.id), // รุ่น Hardware
          userId: parseInt(userId),
          managedDeviceId: parseInt(managedDeviceId) // ✅ ผูกกับตัวอุปกรณ์ (Site) โดยตรง
        }
      });
      console.log(`History saved for device #${managedDeviceId}`);
    } catch (err) {
      console.error("Error saving history:", err);
      // ไม่ throw error เพื่อให้ Flow หลักทำงานต่อไปได้
    }
  }
};

// 1. สร้างอุปกรณ์ใหม่ (Create)
exports.createDevice = async (req, res) => {
  try {
    const { name, circuitId, userId, configData } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ error: "Name and UserID are required" });
    }

    // 1.1 สร้าง Device ลง DB (จังหวะนี้จะได้ apiToken มา)
    const newDevice = await prisma.managedDevice.create({
      data: {
        name,
        circuitId,
        userId: parseInt(userId),
        configData: configData || {}, // บันทึกไปก่อน (ยังไม่มี Token)
        status: "ACTIVE"
      }
    });

    // 1.2 "ยัดไส้" Token กลับเข้าไปใน ConfigData
    let finalConfigData = configData;
    if (configData) {
      finalConfigData = {
        ...configData,
        token: newDevice.apiToken, // เอา Token จริงจาก DB ใส่เข้าไป
      };

      // 1.3 อัปเดต Device กลับอีกรอบ เพื่อให้ configData ในตารางหลักมี Token ด้วย
      await prisma.managedDevice.update({
        where: { id: newDevice.id },
        data: { configData: finalConfigData }
      });

      // 1.4 บันทึก History
      await saveConfigHistory(userId, name, finalConfigData, newDevice.id);
    }

    // 1.5 Log กิจกรรม
    await prisma.activityLog.create({
      data: {
        userId: parseInt(userId),
        action: "CREATE_DEVICE",
        details: `Created device: ${name} (${circuitId || '-'})`
      }
    });

    res.status(201).json({ ...newDevice, configData: finalConfigData });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create device" });
  }
};

// 2. อัปเดตอุปกรณ์ (Update / Save Config)
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { configData, name, circuitId, status } = req.body; 

    const oldDevice = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!oldDevice) return res.status(404).json({ error: "Device not found" });

    let finalConfigData = configData;
    if (configData) {
        finalConfigData = {
            ...configData,
            token: oldDevice.apiToken // บังคับใช้ Token เดิมของเครื่องนี้เสมอ
        };
    }

    // 2.1 อัปเดต Device
    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        configData: finalConfigData, 
        ...(name && { name }),           
        ...(circuitId && { circuitId }),
        ...(status && { status }) 
      }
    });

    // 2.2 บันทึก History
    if (finalConfigData) {
      await saveConfigHistory(updatedDevice.userId, updatedDevice.name, finalConfigData, updatedDevice.id);
    }

    // 2.3 บันทึก Log
    await prisma.activityLog.create({
      data: {
        userId: updatedDevice.userId,
        action: "UPDATE_DEVICE",
        details: `Updated config for device: ${updatedDevice.name}`
      }
    });

    res.json(updatedDevice);
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Failed to update device configuration" });
  }
};

// 3. รับ Heartbeat (Monitoring)
exports.handleHeartbeat = async (req, res) => {
  try {
    const device = req.device; 
    const remoteIp = req.socket.remoteAddress || req.ip; 

    // ✅ เพิ่มการรับค่า boardName มาจาก req.body
    const { cpu, ram, uptime, version, storage, temp, latency, boardName } = req.body; 

    await prisma.managedDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        currentIp: remoteIp,
        cpuLoad: cpu ? parseInt(cpu) : undefined,
        memoryUsage: ram ? parseInt(ram) : undefined,
        uptime: uptime || undefined,
        version: version || undefined,
        boardName: boardName || undefined, // ✅ อัปเดต boardName ลง Database ทุกครั้งที่ Heartbeat มา
        storage: storage ? parseInt(storage) : undefined,
        temp: temp || undefined,
        latency: latency || undefined,
        status: device.status === 'DELETED' ? 'DELETED' : "ACTIVE" 
      }
    });

    // เช็ค Pending Command
    let commandToSend = "none";
    if (device.pendingCmd) {
      commandToSend = device.pendingCmd;
      await prisma.managedDevice.update({
        where: { id: device.id },
        data: { pendingCmd: null }
      });
      
      await prisma.activityLog.create({
        data: {
          userId: device.userId,
          action: "UPDATE_DEVICE", 
          details: `Executed remote command: ${commandToSend} on ${device.name}`
        }
      });
    }

    res.json({
      status: "ok",
      command: commandToSend
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Heartbeat process failed" });
  }
};

// 4. ดึงรายการอุปกรณ์ (List)
exports.getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const devices = await prisma.managedDevice.findMany({
      where: { 
        userId: parseInt(userId),
      },
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
          model: modelObj 
        };
    });

    res.json(result);
  } catch (error) {
    console.error("Fetch devices error:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};

// 5. ดึงประวัติ Config (History)
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
    console.error("Get history failed:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

// 6. ดึงข้อมูลอุปกรณ์รายตัว (Detail)
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.managedDevice.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!device) return res.status(404).json({ error: "Device not found" });
    
    if (device.configData && device.configData.selectedModel) {
      device.model = device.configData.selectedModel;
    }
    
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch device detail" });
  }
};

// 7. Log การดาวน์โหลด
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
    console.error("Log download failed:", error);
    res.status(500).json({ error: "Failed to log download activity" });
  }
};

// 8. ลบอุปกรณ์ (Soft Delete)
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'DELETED' 
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: device.userId,
        action: "UPDATE_DEVICE", 
        details: `Soft deleted device: ${device.name} (${device.circuitId || '-'})`
      }
    });

    res.json({ message: "Device marked as inactive (Soft Delete) successfully" });
  } catch (error) {
    console.error("Delete device error:", error);
    res.status(500).json({ error: "Failed to delete device" });
  }
};

// 9. กู้คืนอุปกรณ์ (Restore Soft Deleted)
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
        details: `Restored device: ${device.name} (${device.circuitId || '-'})`
      }
    });

    res.json({ message: "Device restored successfully" });
  } catch (error) {
    console.error("Restore device error:", error);
    res.status(500).json({ error: "Failed to restore device" });
  }
};