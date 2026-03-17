const settingService = require('../services/settingService');
const logService = require('../services/logService');
const prisma = require('../config/prisma');
const axios = require('axios');

exports.getSettings = async (req, res) => {
  const result = await settingService.getSettings(req.query.key);
  res.json(result);
};

exports.testAIConnection = async (req, res) => {
  let { apiKey } = req.body;

  if (!apiKey) return res.status(400).json({ error: "API Key is required" });

  // 🧹 Clean API Key
  apiKey = apiKey.trim().replace(/^"|"$/g, '');

  console.log(`🤖 Testing Gemini AI Connection (Key starts with: ${apiKey.substring(0, 5)}...)`);

  try {
    // ใช้ v1 API และระบุโมเดลให้ชัดเจน
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: "Hi, respond with 'OK'" }] }]
    }, { timeout: 15000 });
    
    if (response.status === 200 && response.data.candidates) {
      return res.json({ 
        success: true, 
        message: "เชื่อมต่อกับ Gemini API สำเร็จ! AI พร้อมใช้งานแล้วครับ" 
      });
    }
    
    res.status(400).json({ error: "Gemini API returned unexpected response" });
  } catch (error) {
    console.error("❌ Test Gemini Connection Error Details:");
    console.error(` - Message: ${error.message}`);
    
    let errorMsg = "ไม่สามารถเชื่อมต่อกับ Google AI ได้ (404 Not Found หรือปัญหาอื่นๆ)";
    
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Data:`, JSON.stringify(error.response.data));
      if (error.response.status === 404) errorMsg = "ไม่พบ Model gemini-1.5-flash หรือ URL API ผิดพลาด";
      if (error.response.status === 400) errorMsg = "API Key ไม่ถูกต้อง หรือพารามิเตอร์ผิดพลาด";
    }

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