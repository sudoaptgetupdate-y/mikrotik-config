const settingService = require('../services/settingService');
const prisma = require('../config/prisma');

exports.getSettings = async (req, res) => {
  const result = await settingService.getSettings(req.query.key);
  res.json(result);
};

exports.updateSetting = async (req, res) => {
  const { value, description } = req.body;
  const result = await settingService.updateSetting(req.params.key, value, description, req.user.id);
  res.json({ message: `${req.params.key} updated successfully`, data: result });
};

// 🟢 เพิ่มฟังก์ชันใหม่ สำหรับบันทึกค่า Auto Cleanup (Upsert)
exports.upsertSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    // ใช้ upsert: ถ้ามีข้อมูลอยู่แล้วให้อัปเดต ถ้ายังไม่มีให้สร้างใหม่เลย
    const updated = await prisma.systemSetting.upsert({
      where: { key: key },
      update: { value: value, description: description || '' },
      create: { key: key, value: value, description: description || '' }
    });
    
    res.json(updated);
  } catch (error) {
    console.error("❌ Error in upsertSetting:", error);
    res.status(500).json({ error: error.message });
  }
};