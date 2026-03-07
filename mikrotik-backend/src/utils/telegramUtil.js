const axios = require('axios');

exports.sendTelegramAlert = async (botToken, chatId, message, replyToMessageId = null) => {
  if (!botToken || !chatId) return null;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };

    // 🟢 ถ้ามีการส่ง ID ข้อความเดิมมา ให้สั่ง Reply
    if (replyToMessageId) {
      payload.reply_parameters = { message_id: replyToMessageId }; 
      // หมายเหตุ: ใช้ reply_to_message_id (เก่า) หรือ reply_parameters (ใหม่) ก็ได้ แต่เพื่อความชัวร์ ใช้แบบนี้ครับ
      payload.reply_to_message_id = replyToMessageId;
    }

    const res = await axios.post(url, payload);
    return res.data?.result?.message_id; // 🟢 ส่งคืน Message ID เพื่อเอาไปเซฟลง DB
  } catch (error) {
    console.error("❌ Telegram Send Error:", error.response?.data?.description || error.message);
    return null;
  }
};

exports.setupTelegramWebhook = async (botToken) => {
  const baseUrl = process.env.API_BASE_URL;
  
  // Telegram บังคับว่า Webhook ต้องเป็น HTTPS และไม่ใช่ localhost
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    console.log("⚠️ ข้ามการตั้งค่า Webhook อัตโนมัติ (ระบบรองรับเฉพาะโดเมนจริงที่มี HTTPS)");
    return;
  }

  try {
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    const response = await axios.post(url, { url: webhookUrl });
    
    if (response.data.ok) {
      console.log(`✅ Telegram Webhook registered successfully for token ending in ...${botToken.slice(-5)}`);
    }
  } catch (error) {
    console.error(`❌ Failed to set Telegram Webhook:`, error.response?.data?.description || error.message);
  }
};