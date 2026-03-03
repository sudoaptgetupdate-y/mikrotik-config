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