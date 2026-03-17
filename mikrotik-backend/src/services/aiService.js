const axios = require('axios');
const prisma = require('../config/prisma');

/**
 * ดึงการตั้งค่า AI จากฐานข้อมูล
 */
const getAIConfig = async () => {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['AI_ENABLED', 'AI_OLLAMA_URL', 'AI_OLLAMA_MODEL', 'AI_SYSTEM_PROMPT']
      }
    }
  });

  const config = {};
  settings.forEach(s => {
    let parsed = s.value;
    
    // 🟢 Robust Parsing: แกะ String วนไปจนกว่าจะได้ Object หรือค่าจริง (แก้ปัญหา Double Stringify)
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
  return String(config.AI_ENABLED) === 'true';
};

/**
 * ส่งคำถามไปยัง Ollama AI
 * @param {string} userMessage - ข้อความจากผู้ใช้
 * @param {string} systemContext - ข้อมูลสรุปสถานะระบบเพื่อประกอบการตอบ
 */
exports.askAI = async (userMessage, systemContext = "") => {
  const config = await getAIConfig();

  if (String(config.AI_ENABLED) !== 'true') {
    return null;
  }

  let ollamaUrl = config.AI_OLLAMA_URL || 'http://localhost:11434';
  const model = config.AI_OLLAMA_MODEL || 'qwen2.5:7b';
  const systemPrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';

  // 🧹 Clean URL: ตัดช่องว่างและฟันหนูออก
  ollamaUrl = ollamaUrl.trim().replace(/^"|"$/g, '');

  console.log(`🤖 AI Request: URL=${ollamaUrl}, Model=${model}`);
  
  try {
    const payload = {
      model: model,
      system: `${systemPrompt}\n\n[ข้อมูลสถานะระบบปัจจุบัน]\n${systemContext}`,
      prompt: userMessage,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
        // num_thread, num_predict, num_ctx ถูกถอนออกเพื่อให้ใช้ประสิทธิภาพสูงสุดของเครื่อง
      }
    };

    const response = await axios.post(`${ollamaUrl}/api/generate`, payload, { 
      timeout: 90000,
      proxy: false // 🚫 ทดสอบปิด Proxy เฉพาะกิจเพื่อดูความเร็วที่แท้จริง
    });

    if (response.data && response.data.response) {
      console.log(`✅ AI Response Received (${response.data.response.length} chars)`);
      return response.data.response;
    }

    console.warn("⚠️ AI Response format unexpected:", response.data);
    return null;
  } catch (error) {
    console.error("❌ AI Service Error Details:");
    console.error(` - Message: ${error.message}`);
    if (error.response) {
      console.error(` - Status: ${error.response.status}`);
      console.error(` - Data:`, error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      return "ไม่สามารถเชื่อมต่อกับ Server AI ได้ครับ (Connection Refused)";
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return "AI ใช้เวลาประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งครับ";
    }
    return null;
  }
};
