const telegramService = require('../services/telegramService');
const { sendTelegramAlert } = require('../utils/telegramUtil');

/**
 * 🎯 จัดการ Webhook จาก Telegram Bot
 */
exports.handleWebhook = async (req, res) => {
  // ตอบกลับ Telegram ทันทีว่าได้รับข้อมูลแล้ว (Status 200) เพื่อป้องกันการส่งซ้ำ
  res.sendStatus(200);
  
  try {
    // ส่งต่อให้ Service ประมวลผล Logic ต่อ
    await telegramService.handleTelegramWebhook(req);
  } catch (error) {
    console.error("❌ Telegram Webhook Controller Error:", error.message);
  }
};

/**
 * 🎯 ทดสอบการเชื่อมต่อ Telegram (จากหน้า Dashboard)
 */
exports.testTelegramConnection = async (req, res) => {
  const { botToken, chatId, message } = req.body;
  
  if (!botToken || !chatId) {
    return res.status(400).json({ error: "Bot Token and Chat ID are required" });
  }

  try {
    const msgId = await sendTelegramAlert(botToken, chatId, message || "🔔 Telegram Test Connection Successful!");
    if (msgId) {
      res.json({ success: true, messageId: msgId });
    } else {
      res.status(400).json({ error: "Failed to send message. Please check your Token and Chat ID." });
    }
  } catch (error) {
    console.error("❌ Telegram Test Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ⚠️ หมายเหตุ: ฟังก์ชัน Cron เดิมถูกย้ายไปที่ services/cronJobs.js แล้วครับ
