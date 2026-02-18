const prisma = require('../config/prisma');

// 1. ดึงข้อมูล Model ทั้งหมดพร้อม Port
exports.getModels = async (req, res) => {
  try {
    const models = await prisma.deviceModel.findMany({
      include: { 
        ports: true,
        _count: {
          select: { configs: true } // ✅ เอากลับมาแล้ว! นับจำนวน Config ที่ใช้รุ่นนี้
        }
      },
      orderBy: { id: 'desc' } 
    });
    res.json(models);
  } catch (error) {
    console.error("Fetch models error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

// 2. สร้าง Model ใหม่ พร้อม Port แบบ Dynamic
exports.createModel = async (req, res) => {
  try {
    const { name, imageUrl, ports } = req.body;
    
    // Validate เบื้องต้น
    if (!name || !ports || ports.length === 0) {
      return res.status(400).json({ error: "Model name and at least one port are required." });
    }

    const newModel = await prisma.deviceModel.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        ports: {
          create: ports // รับเป็น Array [{ name, type, defaultRole }]
        }
      },
      include: { ports: true }
    });
    
    res.status(201).json(newModel);
  } catch (error) {
    console.error("Create model error:", error);
    res.status(500).json({ error: "Failed to create model. Name might already exist." });
  }
};

// 3. ลบ Model
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;

    // ระบบป้องกัน: เช็คก่อนว่ามี Config หรือ History ไหนใช้งาน Model นี้อยู่ไหม
    const inUse = await prisma.config.findFirst({ 
      where: { deviceModelId: parseInt(id) } 
    });
    
    if (inUse) {
      return res.status(400).json({ 
        error: "Cannot delete this model because it is currently used in device configurations." 
      });
    }

    // ลบ Model (บรรดา Ports ที่ผูกกับ Model นี้จะถูกลบอัตโนมัติ เพราะเราทำ onDelete: Cascade ไว้ใน Schema)
    await prisma.deviceModel.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true, message: "Model deleted successfully" });
  } catch (error) {
    console.error("Delete model error:", error);
    res.status(500).json({ error: "Failed to delete model" });
  }
};