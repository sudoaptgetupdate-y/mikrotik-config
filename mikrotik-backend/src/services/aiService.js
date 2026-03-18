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
  const basePrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';
  
  // 🟢 สร้าง Advanced System Instruction เพื่อให้ AI ทำงานร่วมกับ Bot ได้สมูทขึ้น
  const systemPrompt = `
${basePrompt}

คุณทำงานร่วมกับ "Mikrotik Management Bot" ใน Telegram
ข้อมูลที่คุณได้รับคือสถานะปัจจุบันของอุปกรณ์ในระบบ (Real-time Context)

### กฎการตอบคำถาม:
1. **สำเนียงและโทน**: ใช้ภาษาที่เป็นกันเอง สุภาพ และเป็นมืออาชีพ (ใช้หางเสียง ครับ/ค่ะ)
2. **การใช้ Emoji**: ใช้ Emoji เหมือนที่ Bot ใช้ เช่น 🟢 Online, 🔴 Offline, ⚠️ Warning, ⚡ CPU, 🧩 RAM, 🌡️ Temp
3. **การอ้างถึงอุปกรณ์**: หากมีการเอ่ยถึงชื่ออุปกรณ์ หรือ Circuit ID ให้ใช้ตัวหนา **[ชื่ออุปกรณ์]** และครอบ Circuit ID ด้วยโค้ดเช่น \`7534j\`
4. **แนะนำคำสั่ง (Call to Action)**: หากคำตอบเกี่ยวข้องกับเรื่องใด ให้แนะนำคำสั่งที่เกี่ยวข้องให้ผู้ใช้ด้วย เช่น:
   - เรื่องสถานะทั่วไป: แนะนำ "/status [ชื่อหรือ ID]"
   - เรื่องปัญหา/ออฟไลน์: แนะนำ "/problem" หรือ "/offline"
   - เรื่องสรุปภาพรวม: แนะนำ "/report" หรือ "/top"
5. **ความแม่นยำ**: หากผู้ใช้ถามถึงอุปกรณ์ที่ไม่มีใน Context ให้แจ้งสุภาพว่า "ไม่พบข้อมูลอุปกรณ์นี้ในระบบ" และแนะนำให้ลองพิมพ์ชื่อให้ถูกต้อง
6. **กระชับ**: ตอบให้ตรงประเด็น ไม่เยิ่นเย้อจนเกินไป

### [AVAILABLE_BOT_COMMANDS]
- /status [ชื่อหรือ ID] : ดูรายละเอียดเชิงลึกของอุปกรณ์
- /report : ดูรายงานสรุปสถานะทุกกลุ่ม
- /offline : ดูรายชื่ออุปกรณ์ที่ขาดการติดต่อ
- /problem : ดูอุปกรณ์ที่มีปัญหา (Warning/Offline) ที่ยังไม่ได้ Ack
- /top : ดูอันดับการใช้งานทรัพยากรสูงสุด
- /menu : เปิดเมนูปุ่มกดหลัก
  `.trim();
  
  // 🧹 Clean API Key
  apiKey = apiKey.trim().replace(/^"|"$/g, '');

  // 🔑 ดึงข้อมูลการตั้งค่า Global Settings ทั้งหมด (ยกเว้นเรื่องที่ Sensitive)
  const allSettings = await prisma.systemSetting.findMany();
  let settingsContext = "\n### [GLOBAL_SETTINGS]\n";
  allSettings.forEach(s => {
    // กรองออก: AI Keys และอะไรก็ตามที่มีคำว่า ADMIN
    if (s.key.includes('AI_GEMINI_KEY') || s.key.includes('ADMIN') || s.key.includes('TOKEN') || s.key.includes('PASSWORD')) {
      return;
    }
    settingsContext += `- ${s.key}: ${s.value}\n`;
  });

  // ลำดับรุ่นที่ต้องการใช้งาน (Priority List)
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
  
  let lastError = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`🤖 Gemini AI Request: Model=${model}`);

    try {
      const payload = {
        contents: [{
          parts: [{
            text: `System Instruction: ${systemPrompt}\n\nCurrent System Context:\n${systemContext}${settingsContext}\n\nUser Question: ${userMessage}`
          }]
        }]
      };

      const response = await axios.post(url, payload, { 
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        const reply = response.data.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini Response Received via ${model} (${reply.length} chars)`);
        return reply;
      }
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      console.warn(`⚠️ Gemini Model ${model} failed (Status: ${status}). Trying next candidate...`);
      
      // ถ้า Error ไม่ใช่เรื่อง Quota หรือ Model Not Found (เช่น Key ผิด) ให้หยุดทันที
      if (status !== 429 && status !== 404) break;
      continue;
    }
  }

  // ถ้าวนจนครบแล้วยังไม่ได้
  const error = lastError;
  console.error("❌ Gemini AI Service All Models Failed:");
  
  if (error && error.response) {
    console.error(` - Status: ${error.response.status}`);
    console.error(` - Google Error Body:`, JSON.stringify(error.response.data));
    
    if (error.response.status === 429) {
      return "ขออภัยครับ ตอนนี้โควต้า Gemini API (Free Tier) ของคุณเต็มแล้ว กรุณารอสักครู่หรือเปลี่ยนไปใช้ API Key อื่นนะครับ";
    }
  } else if (error) {
    console.error(` - Message: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      return "ไม่สามารถเชื่อมต่อกับ Google AI ได้ครับ (Connection Refused)";
    }
  }
  
  return "ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว (Gemini API Error)";
};
