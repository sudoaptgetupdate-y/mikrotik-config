const prisma = require('../config/prisma');

// 1. สำหรับ Web: สร้างอุปกรณ์ใหม่ (Provisioning)
exports.createDevice = async (req, res) => {
  try {
    const { name, circuitId, userId } = req.body;

    // Validation ง่ายๆ
    if (!name || !userId) {
      return res.status(400).json({ error: "Name and UserID are required" });
    }

    const newDevice = await prisma.managedDevice.create({
      data: {
        name,
        circuitId,
        userId: parseInt(userId), // แปลงเป็น Int เสมอ
        // apiToken จะถูก Gen อัตโนมัติโดย Prisma
      }
    });

    res.status(201).json(newDevice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create device" });
  }
};

// 2. สำหรับ MikroTik: รับ Heartbeat (Cloud Controller Logic)
exports.handleHeartbeat = async (req, res) => {
  try {
    const device = req.device; // ได้มาจาก Middleware
    const remoteIp = req.socket.remoteAddress || req.ip; // รับ IP จริง

    // อัปเดตสถานะล่าสุด
    await prisma.managedDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        currentIp: remoteIp
      }
    });

    // เช็คว่ามีคำสั่งค้างท่อไหม (Command Queue)
    let commandToSend = "none";
    if (device.pendingCmd) {
      commandToSend = device.pendingCmd;
      
      // ส่งแล้วลบทิ้งทันที กันทำซ้ำ
      await prisma.managedDevice.update({
        where: { id: device.id },
        data: { pendingCmd: null }
      });
    }

    // ตอบกลับ MikroTik
    res.json({
      status: "ok",
      command: commandToSend
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Heartbeat process failed" });
  }
};

// 3. สำหรับ Web: ดึงรายการอุปกรณ์
exports.getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const devices = await prisma.managedDevice.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });
    
    // คำนวณ Online/Offline (Logic 5 นาที)
    const result = devices.map(d => {
        const isOnline = d.lastSeen && (new Date() - new Date(d.lastSeen) < 5 * 60 * 1000);
        return { ...d, isOnline };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch devices" });
  }
};