// src/controllers/settingController.js
const prisma = require('../config/prisma'); // ✅ เปลี่ยนมาใช้ Shared Prisma Client

// 1. ดึงการตั้งค่าทั้งหมด (หรือดึงตาม Key)
exports.getSettings = async (req, res) => {
  try {
    const { key } = req.query;
    
    if (key) {
      const setting = await prisma.systemSetting.findUnique({ where: { key } });
      if (!setting) return res.status(404).json({ message: 'Setting not found' });
      return res.json({ ...setting, value: JSON.parse(setting.value) });
    }

    const settings = await prisma.systemSetting.findMany();
    // แปลง String เป็น JSON Object ก่อนส่งให้ Frontend
    const formattedSettings = settings.map(s => ({
      ...s,
      value: JSON.parse(s.value)
    }));

    res.json(formattedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. อัปเดตการตั้งค่า (รองรับ Upsert: ถ้าไม่มีให้สร้างใหม่ ถ้ามีให้อัปเดต)
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body; // value ที่ส่งมาต้องเป็น Array หรือ Object
    
    const actionUserId = req.user.id; // ✅ ดึง ID ของ Super Admin ที่ทำการแก้ไขจาก Token

    // 🛡️ [Security & Logic Check]: ป้องกันการบันทึก Monitor IP น้อยกว่า 5 ตัว
    if (key === 'MONITOR_IPS') {
      if (!Array.isArray(value) || value.length < 5) {
        return res.status(400).json({ 
          message: 'Monitor IPs must contain at least 5 IP addresses for Failover system to work properly.' 
        });
      }
    }

    // ทำการ Upsert (Update or Insert)
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: { 
        value: JSON.stringify(value),
        ...(description && { description }) 
      },
      create: { 
        key, 
        value: JSON.stringify(value),
        description: description || `System configuration for ${key}`
      }
    });

    // ✅ บันทึก Audit Log แจ้งว่ามีการอัปเดตระบบการตั้งค่า
    await prisma.activityLog.create({
      data: {
        userId: actionUserId, 
        action: "UPDATE_DEVICE", // อาศัย Action นี้เป็นหมวดหมู่หลักของการแก้ไข
        details: `Updated global setting: ${key}` // ระบุชัดเจนว่าแก้ค่าอะไร
      }
    });

    res.json({
      message: `${key} updated successfully`,
      data: { ...updatedSetting, value: JSON.parse(updatedSetting.value) }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};