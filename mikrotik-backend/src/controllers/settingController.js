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

    // 2. ลำดับความสำคัญของ Model ที่จะทดสอบ
    const candidateModels = [
      "models/gemini-2.5-flash",
      "models/gemini-2.0-flash",
      "models/gemini-1.5-flash",
      "models/gemini-flash-latest"
    ];

    let modelToUse = "";
    // กรองเอาเฉพาะที่มีอยู่ใน Available Models
    const validCandidates = candidateModels.filter(m => availableModels.some(am => am.name === m));
    
    // ถ้าไม่มีใน List เลย ให้เอาตัวแรกที่มีคำว่า flash
    if (validCandidates.length === 0) {
      const anyFlash = availableModels.find(m => m.name.includes("flash"));
      if (anyFlash) validCandidates.push(anyFlash.name);
      else if (availableModels.length > 0) validCandidates.push(availableModels[0].name);
    }

    if (validCandidates.length === 0) {
      throw new Error("No models available for this API Key.");
    }

    // 3. ทดสอบยิงจริง (ลองวน Loop ตัวที่มีสิทธิ์)
    let lastError = null;
    for (const model of validCandidates) {
      console.log(`🤖 Testing model: ${model}...`);
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(testUrl, {
          contents: [{ parts: [{ text: "Hi" }] }]
        }, { 
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 200) {
          return res.json({ 
            success: true, 
            message: `เชื่อมต่อสำเร็จ! ระบบเลือกใช้รุ่น: ${model.replace('models/', '')} (พบว่ารุ่นนี้มีโควต้าใช้งานได้)` 
          });
        }
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const errMsg = error.response?.data?.error?.message || "";
        
        console.warn(`⚠️ Model ${model} failed (Status: ${status}): ${errMsg.substring(0, 100)}...`);
        
        // ถ้าไม่ใช่ Error เรื่อง Quota (เช่น Key ผิด) ให้หยุดลองตัวอื่นแล้วแจ้ง Error เลย
        if (status !== 429 && status !== 404) break;
        
        // ถ้าเป็น 429 แต่ในเนื้อหาบอกว่า limit > 0 (คือเต็มจริงๆ) ก็อาจจะหยุด
        // แต่ถ้า limit: 0 แสดงว่ารุ่นนี้ใช้ไม่ได้ ให้ลองตัวถัดไป
        continue;
      }
    }
    
    // ถ้าวนจนครบแล้วยังไม่ได้
    throw lastError;
  } catch (error) {
    console.error("❌ Diagnostic Error:");
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Data:`, JSON.stringify(error.response.data));
    } else {
      console.error(` - Message: ${error.message}`);
    }

    let errorMsg = error.message;
    if (error.response) {
      if (error.response.status === 429) {
        errorMsg = "เกินโควต้าการใช้งาน (Quota Exceeded): คุณใช้งาน Gemini API ครบตามกำหนดของ Free Tier แล้ว กรุณารอสักครู่หรือลองใหม่ในภายหลัง";
      } else if (error.response.status === 403) {
        errorMsg = "API Key นี้ยังไม่ได้เปิดสิทธิ์ Generative Language API หรือถูกระงับ";
      } else if (error.response.status === 404) {
        errorMsg = "ไม่พบ Model ที่ต้องการใช้งานบน Google Cloud โปรเจกต์นี้";
      }
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