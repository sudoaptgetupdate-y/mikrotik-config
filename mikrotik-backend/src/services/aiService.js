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
    try {
      config[s.key] = JSON.parse(s.value);
    } catch (e) {
      config[s.key] = s.value;
    }
  });

  return config;
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

  const ollamaUrl = config.AI_OLLAMA_URL || 'http://localhost:11434';
  const model = config.AI_OLLAMA_MODEL || 'qwen2.5:7b';
  const systemPrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';

  try {
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model: model,
      system: `${systemPrompt}\n\n[ข้อมูลสถานะระบบปัจจุบัน]\n${systemContext}`,
      prompt: userMessage,
      stream: false
    }, { 
      timeout: 45000 // ตั้งเผื่อไว้สำหรับ CPU Inference
    });

    return response.data.response;
  } catch (error) {
    console.error("❌ AI Service Error:", error.message);
    if (error.code === 'ECONNREFUSED') {
      return "ไม่สามารถเชื่อมต่อกับ Server AI ได้ครับ (Connection Refused)";
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return "AI ใช้เวลาประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งครับ";
    }
    return null;
  }
};
