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
  apiKey = apiKey.trim().replace(/^"|"$/g, '');

  console.log(`🤖 >>> DIAGNOSING GEMINI API <<<`);

  try {
    // 1. ลองดึงรายชื่อ Models ทั้งหมดที่ Key นี้เข้าถึงได้
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await axios.get(listUrl, { timeout: 10000 });
    
    const availableModels = listResponse.data.models || [];
    console.log("✅ Available Models for this Key:", availableModels.map(m => m.name).join(", "));

    // 2. ตรวจสอบรุ่นที่แนะนำ (Gemini 2.0 Flash มีในลิสต์ปี 2026)
    let modelToUse = "";
    if (availableModels.some(m => m.name.includes("gemini-2.0-flash"))) {
      modelToUse = "models/gemini-2.0-flash";
    } else if (availableModels.some(m => m.name.includes("gemini-flash-latest"))) {
      modelToUse = "models/gemini-flash-latest";
    } else {
      modelToUse = availableModels[0]?.name;
    }

    if (!modelToUse) {
      throw new Error("No models available for this API Key.");
    }

    console.log(`🤖 Using model for test: ${modelToUse}`);

    // 3. ทดสอบยิงจริง
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/${modelToUse}:generateContent?key=${apiKey}`;
    const response = await axios.post(testUrl, {
      contents: [{ parts: [{ text: "Hi" }] }]
    }, { 
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
      return res.json({ 
        success: true, 
        message: `เชื่อมต่อสำเร็จ! ใช้รุ่น: ${modelToUse.replace('models/', '')}` 
      });
    }
    
    res.status(400).json({ error: "Unexpected response from Gemini" });
  } catch (error) {
    console.error("❌ Diagnostic Error:");
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Data:`, JSON.stringify(error.response.data));
    } else {
      console.error(` - Message: ${error.message}`);
    }

    let errorMsg = error.message;
    if (error.response && error.response.status === 403) errorMsg = "API Key นี้ยังไม่ได้เปิดสิทธิ์ Generative Language API หรือถูกระงับ";
    if (error.response && error.response.status === 404) errorMsg = "ไม่พบ Model ที่ต้องการใช้งานบน Google Cloud โปรเจกต์นี้";

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