const prisma = require('../config/prisma');

// ฟังก์ชันช่วยบันทึก History (ใช้ซ้ำได้)
const saveConfigHistory = async (userId, name, configData) => {
  // เช็คว่ามีข้อมูล config และ model id หรือไม่
  if (configData && configData.selectedModel && configData.selectedModel.id) {
    try {
      await prisma.config.create({
        data: {
          projectName: name,
          inputData: JSON.stringify(configData), // เก็บ JSON Config
          generatedScript: "", // (อนาคตค่อยส่ง script มาเก็บ) ใส่ว่างไว้ก่อนเพราะ Database บังคับ
          deviceModelId: parseInt(configData.selectedModel.id), // ✅ จุดสำคัญ: ตัวนับจะนับจาก ID นี้
          userId: parseInt(userId)
        }
      });
      console.log("History saved for model:", configData.selectedModel.name);
    } catch (err) {
      console.error("Error saving history:", err);
      // ไม่ throw error เพื่อให้การทำงานหลักยังเดินต่อได้
    }
  }
};

// 1. สร้างอุปกรณ์ใหม่ (Create)
exports.createDevice = async (req, res) => {
  try {
    const { name, circuitId, userId, configData } = req.body; // ✅ รับ configData มาด้วย

    if (!name || !userId) {
      return res.status(400).json({ error: "Name and UserID are required" });
    }

    // 1.1 สร้าง Device
    const newDevice = await prisma.managedDevice.create({
      data: {
        name,
        circuitId,
        userId: parseInt(userId),
        configData: configData || {} // บันทึก Config ลง Device ด้วย
      }
    });

    // 1.2 ✅ บันทึกลงตาราง Config (เพื่อให้ตัวนับทำงาน)
    if (configData) {
      await saveConfigHistory(userId, name, configData);
    }

    res.status(201).json(newDevice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create device" });
  }
};

// 2. อัปเดตอุปกรณ์ (Update / Save Config)
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { configData, name, circuitId } = req.body; 

    // 2.1 อัปเดต Device
    const updatedDevice = await prisma.managedDevice.update({
      where: { id: parseInt(id) },
      data: {
        configData: configData,
        ...(name && { name }),           // อัปเดตชื่อถ้าส่งมา
        ...(circuitId && { circuitId })  // อัปเดต circuitId ถ้าส่งมา
      }
    });

    // 2.2 ✅ บันทึกลงตาราง Config (เพื่อให้ตัวนับทำงาน และเก็บ History)
    if (configData) {
      // ดึง userId เจ้าของเครื่องมาเพื่อบันทึก log
      const userId = updatedDevice.userId; 
      await saveConfigHistory(userId, updatedDevice.name, configData);
    }

    res.json(updatedDevice);
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ error: "Failed to update device configuration" });
  }
};

// 3. รับ Heartbeat (เหมือนเดิม)
exports.handleHeartbeat = async (req, res) => {
  try {
    const device = req.device; 
    const remoteIp = req.socket.remoteAddress || req.ip; 

    await prisma.managedDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        currentIp: remoteIp
      }
    });

    let commandToSend = "none";
    if (device.pendingCmd) {
      commandToSend = device.pendingCmd;
      await prisma.managedDevice.update({
        where: { id: device.id },
        data: { pendingCmd: null }
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

// 4. ดึงรายการอุปกรณ์ (เหมือนเดิม)
exports.getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const devices = await prisma.managedDevice.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });
    
    const result = devices.map(d => {
        const isOnline = d.lastSeen && (new Date() - new Date(d.lastSeen) < 5 * 60 * 1000);
        return { ...d, isOnline };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};