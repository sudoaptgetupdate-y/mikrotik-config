const prisma = require('../config/prisma');

// 1. ดึงข้อมูล Model (รองรับการดูทั้งแบบ Active และ Soft Deleted)
exports.getModels = async (req, res) => {
  try {
    // ✅ เช็คค่าที่ส่งมาจาก Frontend (ถ้ากด Archive ค่าจะเป็น 'true')
    const isShowDeleted = req.query.showDeleted === 'true'; 

    const models = await prisma.deviceModel.findMany({
      where: { 
        // 👈 จุดสำคัญ: เขียนแบบนี้จะชัวร์ที่สุด 
        // ถ้า isShowDeleted เป็นจริง -> ให้หาตัวที่ isActive: false (ตัวที่ถูกลบ)
        // ถ้า isShowDeleted เป็นเท็จ -> ให้หาตัวที่ isActive: true (ตัวปกติ)
        isActive: isShowDeleted ? false : true 
      },
      include: { 
        ports: true,
        _count: {
          select: { configs: true } 
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
    
    if (!name || !ports || ports.length === 0) {
      return res.status(400).json({ error: "Model name and at least one port are required." });
    }

    const newModel = await prisma.deviceModel.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        ports: {
          create: ports 
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

// 3. ลบ Model (Hybrid Delete)
exports.deleteModel = async (req, res) => {
  try {
    const { id } = req.params;

    // ระบบป้องกัน: เช็คว่ามี Config ไหนใช้งาน Model นี้อยู่ไหม โดยการนับจำนวน
    const inUseCount = await prisma.config.count({ 
      where: { deviceModelId: parseInt(id) } 
    });
    
    if (inUseCount > 0) {
      // ✅ Soft Delete: ถ้าเคยถูกใช้งานแล้ว ให้ซ่อนไว้ (เปลี่ยน isActive เป็น false)
      await prisma.deviceModel.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      return res.json({ success: true, message: "Model soft-deleted (hidden) successfully. Config history is preserved." });
    } else {
      // ✅ Hard Delete: ถ้ายังไม่เคยถูกใช้งานเลย ลบถาวรได้เลย (Ports จะถูก Cascade Delete ไปด้วย)
      await prisma.deviceModel.delete({
        where: { id: parseInt(id) }
      });
      return res.json({ success: true, message: "Model permanently deleted." });
    }

  } catch (error) {
    console.error("Delete model error:", error);
    res.status(500).json({ error: "Failed to delete model" });
  }
};

// 4. ฟังก์ชันสำหรับกู้คืน Model
exports.restoreModel = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.deviceModel.update({
      where: { id: parseInt(id) },
      data: { isActive: true } // ✅ เปลี่ยนกลับเป็น true
    });
    
    res.json({ success: true, message: "Model restored successfully" });
  } catch (error) {
    console.error("Restore model error:", error);
    res.status(500).json({ error: "Failed to restore model" });
  }
};

// 5. แก้ไข Model (เพิ่มใหม่ - เฉพาะ Super Admin)
exports.updateModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, ports } = req.body;

    if (!name || !ports || ports.length === 0) {
      return res.status(400).json({ error: "Model name and at least one port are required." });
    }

    // ลบ Ports เก่าออกทั้งหมดก่อน
    await prisma.portTemplate.deleteMany({
      where: { deviceModelId: parseInt(id) }
    });

    // อัปเดตข้อมูล Model และสร้าง Ports ใหม่
    const updatedModel = await prisma.deviceModel.update({
      where: { id: parseInt(id) },
      data: {
        name,
        imageUrl: imageUrl || null,
        ports: {
          create: ports.map(p => ({
            name: p.name,
            type: p.type,
            defaultRole: p.defaultRole
          }))
        }
      },
      include: { ports: true }
    });

    res.json(updatedModel);
  } catch (error) {
    console.error("Update model error:", error);
    // กรณีที่แก้ชื่อซ้ำกับ Model อื่นที่มีอยู่แล้ว
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Model name already exists." });
    }
    res.status(500).json({ error: "Failed to update model" });
  }
};