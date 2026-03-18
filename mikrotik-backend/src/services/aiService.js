const axios = require('axios');
const prisma = require('../config/prisma');

/**
 * ดึงการตั้งค่า AI จาก Group (และ Fallback ไปที่ Global System Settings)
 */
const getAIConfig = async (groupId = null) => {
  let config = {
    AI_ENABLED: false,
    AI_GEMINI_KEY: '',
    AI_SYSTEM_PROMPT: ''
  };

  // 1. พยายามดึงจาก Group ก่อนถ้ามีการระบุ groupId
  if (groupId) {
    const group = await prisma.deviceGroup.findUnique({
      where: { id: parseInt(groupId) }
    });

    if (group && group.aiGeminiKey) {
      return {
        AI_ENABLED: group.aiEnabled,
        AI_GEMINI_KEY: group.aiGeminiKey,
        AI_SYSTEM_PROMPT: group.aiSystemPrompt
      };
    }
  }

  // 2. ถ้าไม่มี groupId หรือใน Group ไม่มี Config ให้ไปดึงจาก Global (SystemSetting)
  const keys = ['AI_ENABLED', 'AI_GEMINI_KEY', 'AI_SYSTEM_PROMPT'];
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: keys } }
  });

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
exports.isAIEnabled = async (groupId = null) => {
  const config = await getAIConfig(groupId);
  return (String(config.AI_ENABLED) === 'true' || config.AI_ENABLED === true) && !!config.AI_GEMINI_KEY;
};

/**
 * ส่งคำถามไปยัง Google Gemini AI
 * @param {string} userMessage - ข้อความจากผู้ใช้
 * @param {string} systemContext - ข้อมูลสรุปสถานะระบบ
 * @param {number} groupId - ID ของกลุ่มอุปกรณ์ (ถ้ามี)
 */
exports.askAI = async (userMessage, systemContext = "", groupId = null) => {
  const config = await getAIConfig(groupId);

  if ((String(config.AI_ENABLED) !== 'true' && config.AI_ENABLED !== true) || !config.AI_GEMINI_KEY) {
    return null;
  }

  let apiKey = config.AI_GEMINI_KEY;
  const basePrompt = config.AI_SYSTEM_PROMPT || 'คุณคือผู้ช่วยดูแลระบบ Network';
  
  // 🟢 สร้าง Advanced System Instruction
  const systemPrompt = `
${basePrompt}

คุณทำงานร่วมกับ "Mikrotik Management Bot" ใน Telegram
คุณกำลังให้บริการข้อมูลสำหรับกลุ่มอุปกรณ์ (Device Group) ที่ระบุไว้ในบริบทนี้เท่านั้น

### กฎสำคัญด้านความปลอดภัยและข้อมูล:
1. **ขอบเขตข้อมูล**: ข้อมูลที่คุณได้รับใน [CURRENT_SYSTEM_CONTEXT] คืออุปกรณ์ทั้งหมดที่คุณมีสิทธิ์เข้าถึง "เท่านั้น" ห้ามอ้างถึงอุปกรณ์ ชื่อ หรือ Circuit ID อื่นๆ ที่ไม่อยู่ในรายการนี้
2. **การตอบคำถาม**: หากผู้ใช้ถามถึงอุปกรณ์ที่ไม่มีในรายการ ให้ตอบสุภาพว่า "ไม่พบข้อมูลอุปกรณ์นี้ในกลุ่มของคุณครับ"
3. **สำเนียงและโทน**: ใช้ภาษาที่เป็นกันเอง สุภาพ และเป็นมืออาชีพ (ใช้หางเสียง ครับ/ค่ะ)
4. **การใช้ Emoji**: ใช้ Emoji เช่น 🟢 Online, 🔴 Offline, ⚠️ Warning, ⚡ CPU, 🧩 RAM, 🌡️ Temp
5. **การส่งต่อคำสั่ง (Intent Handover)**: 
   - ตอบด้วยรูปแบบ \`COMMAND: /command_name\` เมื่อผู้ใช้ต้องการดูข้อมูลที่มีคำสั่งรองรับ
6. **กฎการตอบสนองคำสั่ง (Strict Command Only)**: 
   - "สำคัญมาก": หากคำถามของผู้ใช้สามารถตอบได้ด้วยคำสั่งใน [AVAILABLE_BOT_COMMANDS] (โดยเฉพาะการขอสถานะรายเครื่อง /status) ให้คุณตอบเพียง \`COMMAND: /command_name\` เท่านั้น "โดยไม่ต้องมีข้อความทักทายหรือคำอธิบายใดๆ เพิ่มเติม" เพื่อความรวดเร็ว

### กฎการจัดรูปแบบข้อความ (กรณีตอบคำถามทั่วไป):
- ห้ามใช้ Markdown (เช่น ** หรือ __)
- ให้ใช้ HTML Tags ของ Telegram เท่านั้น:
  - <b>ข้อความตัวหนา</b> สำหรับชื่ออุปกรณ์ หรือข้อมูลสำคัญ
  - <code>ข้อความโค้ด</code> สำหรับ Circuit ID, IP หรือค่าตัวเลข
  - <i>ข้อความตัวเอียง</i> สำหรับหมายเหตุ
- ห้ามใส่ Tag HTML อื่นๆ นอกเหนือจาก 3 อย่างนี้เด็ดขาด

### [AVAILABLE_BOT_COMMANDS]
- /status [ชื่อหรือ ID] : ดูรายละเอียดเชิงลึกของอุปกรณ์ (เช่น COMMAND: /status องค์การบริหารส่วนตำบลนาแว)
- /report : ดูรายงานสรุปสถานะของกลุ่มนี้
- /offline : ดูอุปกรณ์ในกลุ่มที่ขาดการติดต่อ
- /problem : ดูอุปกรณ์ที่มีปัญหาในกลุ่ม
- /top : ดูอันดับการใช้งานสูงสุดในกลุ่ม
- /menu : เปิดเมนูหลัก
  `.trim();
  
  // 🧹 Clean API Key
  apiKey = apiKey.trim().replace(/^"|"$/g, '');

  // 🔑 ดึงข้อมูลการตั้งค่า Global Settings ทั้งหมด (ยกเว้นเรื่องที่ Sensitive)
  const allSettings = await prisma.systemSetting.findMany();
  let settingsContext = "\n### [GLOBAL_SETTINGS]\n";
  allSettings.forEach(s => {
    if (s.key.includes('AI_GEMINI_KEY') || s.key.includes('ADMIN') || s.key.includes('TOKEN') || s.key.includes('PASSWORD')) {
      return;
    }
    settingsContext += `- ${s.key}: ${s.value}\n`;
  });

  // ลำดับรุ่นที่ต้องการใช้งาน (Priority List - เน้นความเสถียรของโควต้าเป็นหลัก)
  const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
  
  let lastError = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`🤖 Gemini AI Request (Group: ${groupId || 'Global'}): Model=${model}`);

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
      
      if (status === 429) {
        // ถ้าติด Rate Limit ให้รอ 2 วินาทีก่อนลองรุ่นถัดไป
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (status !== 429 && status !== 404) break;
      continue;
    }
  }

  const error = lastError;
  console.error("❌ Gemini AI Service All Models Failed:");
  if (error && error.response && error.response.status === 429) {
    return "ขออภัยครับ ตอนนี้โควต้า Gemini API ของคุณเต็มแล้วครับ";
  }
  
  return "ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว (Gemini API Error)";
};
