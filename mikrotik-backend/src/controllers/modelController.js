const prisma = require('../config/prisma');

// 1. ดึงข้อมูล Model (รองรับการดูทั้งแบบ Active และ Soft Deleted)
exports.getModels = async (req, res) => {
  try {
    const isShowDeleted = req.query.showDeleted === 'true'; 

    const models = await prisma.deviceModel.findMany({
      where: { 
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
    const actionUserId = req.user.id; // ✅ ดึง ID คนที่สร้างจาก Token
    
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
    
    // ✅ บันทึก Audit Log
    await prisma.activityLog.create({
      data: { 
        userId: actionUserId, 
        action: "CREATE_DEVICE", // ใช้ Action นี้แทนหมวดการสร้าง
        details: `Created hardware model: ${name}` 
      }
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
    const actionUserId = req.user.id; // ✅ ดึง ID คนที่ลบจาก Token

    // ดึงข้อมูลเดิมขึ้นมาก่อนเพื่อเอาชื่อไปบันทึก Log ให้สวยงาม
    const targetModel = await prisma.deviceModel.findUnique({ where: { id: parseInt(id) } });
    if (!targetModel) return res.status(404).json({ error: "Model not found" });

    // ระบบป้องกัน: เช็คว่ามี Config ไหนใช้งาน Model นี้อยู่ไหม โดยการนับจำนวน
    const inUseCount = await prisma.config.count({ 
      where: { deviceModelId: parseInt(id) } 
    });
    
    if (inUseCount > 0) {
      // ✅ Soft Delete
      await prisma.deviceModel.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      
      // ✅ บันทึก Audit Log (Soft Delete)
      await prisma.activityLog.create({
        data: { 
          userId: actionUserId, 
          action: "DELETE_DEVICE", 
          details: `Soft deleted hardware model: ${targetModel.name}` 
        }
      });

      return res.json({ success: true, message: "Model soft-deleted (hidden) successfully. Config history is preserved." });
    } else {
      // ✅ Hard Delete
      await prisma.deviceModel.delete({
        where: { id: parseInt(id) }
      });

      // ✅ บันทึก Audit Log (Hard Delete)
      await prisma.activityLog.create({
        data: { 
          userId: actionUserId, 
          action: "DELETE_DEVICE", 
          details: `Permanently deleted hardware model: ${targetModel.name}` 
        }
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
    const actionUserId = req.user.id; // ✅ ดึง ID คนที่ทำรายการจาก Token

    const updatedModel = await prisma.deviceModel.update({
      where: { id: parseInt(id) },
      data: { isActive: true } // ✅ เปลี่ยนกลับเป็น true
    });
    
    // ✅ บันทึก Audit Log
    await prisma.activityLog.create({
      data: { 
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Restored hardware model: ${updatedModel.name}` 
      }
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
    const actionUserId = req.user.id; // ✅ ดึง ID คนที่แก้จาก Token

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

    // ✅ บันทึก Audit Log
    await prisma.activityLog.create({
      data: { 
        userId: actionUserId, 
        action: "UPDATE_DEVICE", 
        details: `Updated hardware model: ${name}` 
      }
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