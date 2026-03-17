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

  const apiKey = config.AI_GEMINI_KEY;
  const systemPrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';
  
  // Gemini 1.5 Flash API URL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  console.log(`🤖 Gemini AI Request: Model=gemini-1.5-flash`);

  try {
    const payload = {
      contents: [{
        parts: [{
          text: `System Instruction: ${systemPrompt}\n\nCurrent System Context:\n${systemContext}\n\nUser Question: ${userMessage}`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
      }
    };

    const response = await axios.post(url, payload, { 
      timeout: 30000 // Gemini ปกติจะเร็วมาก
      // หมายเหตุ: ไม่ใส่ proxy: false เพราะต้องออกอินเทอร์เน็ตผ่าน Proxy ของระบบ
    });

    if (response.data && response.data.candidates && response.data.contents === undefined) {
      const reply = response.data.candidates[0].content.parts[0].text;
      console.log(`✅ Gemini Response Received (${reply.length} chars)`);
      return reply;
    }

    console.warn("⚠️ Gemini Response format unexpected:", JSON.stringify(response.data));
    return null;
  } catch (error) {
    console.error("❌ Gemini AI Service Error:");
    console.error(` - Message: ${error.message}`);
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Data:`, JSON.stringify(error.response.data));
    }
    
    if (error.code === 'ECONNREFUSED') {
      return "ไม่สามารถเชื่อมต่อกับ Google AI ได้ครับ (Connection Refused)";
    }
    return "ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว (Gemini API Error)";
  }
};
