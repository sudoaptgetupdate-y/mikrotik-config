const settingService = require('../services/settingService');
const logService = require('../services/logService');
const prisma = require('../config/prisma');
const axios = require('axios');

exports.getSettings = async (req, res) => {
  const result = await settingService.getSettings(req.query.key);
  res.json(result);
};

exports.testAIConnection = async (req, res) => {
  let { url, model } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  // 🧹 Clean URL: ตัดฟันหนูและช่องว่าง
  url = url.trim().replace(/^"|"$/g, '');

  console.log(`🤖 Testing AI Connection: ${url} (Model: ${model})`);

  try {
    // 1. ทดสอบยิงไปที่ /api/tags
    const response = await axios.get(`${url}/api/tags`, { 
      timeout: 8000
      // proxy: false ถูกเอาออกตามความต้องการของผู้ใช้ เพื่อให้ใช้งานผ่าน Proxy ระบบได้
    });
    
    if (response.status === 200) {
      const models = response.data.models || [];
      const modelExists = models.some(m => m.name === model || m.name.startsWith(model));
      
      if (modelExists) {
        return res.json({ success: true, message: `เชื่อมต่อสำเร็จ! พบ Model: ${model}` });
      } else {
        return res.json({ success: true, warning: true, message: `เชื่อมต่อ Server ได้ แต่ไม่พบ Model: ${model} ในระบบ` });
      }
    }
    
    res.status(400).json({ error: "Server returned unexpected status" });
  } catch (error) {
    console.error("❌ Test AI Connection Error Details:");
    console.error(` - Message: ${error.message}`);
    console.error(` - Target URL: ${url}`);
    
    let errorMsg = error.message;
    if (error.code === 'ECONNREFUSED') errorMsg = "ไม่สามารถเชื่อมต่อกับ Server AI ได้ (Connection Refused)";
    if (error.code === 'EPROTO') errorMsg = "เกิดข้อผิดพลาดด้าน Protocol (อาจเป็นเพราะพยายามใช้ HTTPS บนพอร์ต HTTP)";

    res.status(500).json({ error: errorMsg });
  }
};

exports.updateSetting = async (req, res) => {
  const { value, description } = req.body;
  const key = req.params.key;
  
  const result = await settingService.updateSetting(key, value, description, req.user.id);
  
  await logService.createActivityLog({
    userId: req.user.id,
    action: 'UPDATE_SETTING',
    details: `แก้ไขการตั้งค่าส่วนกลาง: ${key}`,
    ipAddress: req.ip
  });

  res.json({ message: `${key} updated successfully`, data: result });
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

    await logService.createActivityLog({
      userId: req.user.id,
      action: 'UPDATE_SETTING',
      details: `แก้ไขการตั้งค่าส่วนกลาง (Upsert): ${key}`,
      ipAddress: req.ip
    });
    
    res.json(updated);
  } catch (error) {
    console.error("❌ Error in upsertSetting:", error);
    res.status(500).json({ error: error.message });
  }
};