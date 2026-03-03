const axios = require('axios');

exports.sendTelegramAlert = async (botToken, chatId, message) => {
  if (!botToken || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML' // ใช้ HTML เพื่อทำตัวหนา (<b>) หรือตัวโค้ด (<code>) ได้
    });
  } catch (error) {
    console.error("❌ Telegram Send Error:", error.response?.data?.description || error.message);
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