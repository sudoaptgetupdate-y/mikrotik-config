const axios = require('axios');
const prisma = require('../config/prisma');

/**
 * ดึงการตั้งค่า AI จากฐานข้อมูล
 */
const getAIConfig = async () => {
  const keys = ['AI_ENABLED', 'AI_GEMINI_KEY', 'AI_SYSTEM_PROMPT'];
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: keys } }
  });

  const config = {};
  settings.forEach(s => {
    let parsed = s.value;
    while (typeof parsed === 'string') {
      try {
        const next = JSON.parse(parsed);
        if (next === parsed) break;
        parsed = next;
      } catch (e) {
        break; 
      }
    }
    config[s.key] = parsed;
  });

  return config;
};

/**
 * ตรวจสอบว่าระบบ AI เปิดใช้งานอยู่หรือไม่
 */
exports.isAIEnabled = async () => {
  const config = await getAIConfig();
  return String(config.AI_ENABLED) === 'true' && !!config.AI_GEMINI_KEY;
};

/**
 * ส่งคำถามไปยัง Google Gemini AI
 * @param {string} userMessage - ข้อความจากผู้ใช้
 * @param {string} systemContext - ข้อมูลสรุปสถานะระบบ
 */
exports.askAI = async (userMessage, systemContext = "") => {
  const config = await getAIConfig();

  if (String(config.AI_ENABLED) !== 'true' || !config.AI_GEMINI_KEY) {
    return null;
  }

  let apiKey = config.AI_GEMINI_KEY;
  const systemPrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';
  
  // 🧹 Clean API Key
  apiKey = apiKey.trim().replace(/^"|"$/g, '');

  // Gemini 1.5 Flash API URL (v1 - Stable)
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  console.log(`🤖 Gemini AI Request: Model=gemini-1.5-flash (v1 API)`);

  try {
    const payload = {
      contents: [{
        parts: [{
          text: `System Instruction: ${systemPrompt}\n\nCurrent System Context:\n${systemContext}\n\nUser Question: ${userMessage}`
        }]
      }]
    };

    const response = await axios.post(url, payload, { 
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const reply = response.data.candidates[0].content.parts[0].text;
      console.log(`✅ Gemini Response Received (${reply.length} chars)`);
      return reply;
    }

    console.warn("⚠️ Gemini Response format unexpected:", JSON.stringify(response.data));
    return null;
  } catch (error) {
    console.error("❌ Gemini AI Service Error:");
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Google Error Body:`, JSON.stringify(error.response.data)); // 🔍 ดู Error จริงจาก Google
    } else {
      console.error(` - Message: ${error.message}`);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return "ไม่สามารถเชื่อมต่อกับ Google AI ได้ครับ (Connection Refused)";
    }
    return "ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว (Gemini API Error)";
  }
};
