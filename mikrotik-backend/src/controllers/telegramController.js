const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');

exports.handleWebhook = async (req, res) => {
  // Telegram API ต้องการให้ตอบกลับ 200 OK ทันที เพื่อให้รู้ว่ารับข้อความแล้ว
  res.sendStatus(200);

  const message = req.body.message;
  // ถ้าไม่ใช่ข้อความตัวอักษร ให้ข้ามไป
  if (!message || !message.text) return;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    // 1. ค้นหากลุ่มอุปกรณ์จาก Chat ID ที่พิมพ์เข้ามา
    const group = await prisma.group.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } // ดึงอุปกรณ์ที่ไม่ถูกลบมาด้วย
    });

    // ถ้าแชทนี้ไม่ได้ผูกกับกลุ่มไหนเลย หรือไม่มี Token ให้ข้ามไป
    if (!group || !group.telegramBotToken) return;

    // ==========================================
    // 💬 คำสั่ง /help
    // ==========================================
    if (text === '/help' || text.startsWith('/help@')) {
      const helpMsg = `🤖 <b>คำสั่งที่รองรับ:</b>\n\n/report - สรุปสถานะอุปกรณ์ทั้งหมดในกลุ่มนี้\n/help - ดูคำสั่งทั้งหมด`;
      await sendTelegramAlert(group.telegramBotToken, chatId, helpMsg);
      return;
    }

    // ==========================================
    // 📊 คำสั่ง /report
    // ==========================================
    if (text === '/report' || text.startsWith('/report@')) {
      const devices = group.devices || [];
      
      let onlineList = [];
      let offlineList = [];
      let problemList = [];

      // วนลูปเช็คสถานะแต่ละอุปกรณ์ (Logic เดียวกับ Frontend)
      devices.forEach(d => {
        // เช็ค Offline (ขาดการติดต่อเกิน 3 นาที)
        const diffMinutes = d.lastSeen ? (new Date() - new Date(d.lastSeen)) / 1000 / 60 : 999;
        if (diffMinutes > 3) {
          offlineList.push(d);
          return;
        }

        // อ่านค่าต่างๆ
        const cpu = parseFloat(d.cpuLoad) || 0;
        const ram = parseFloat(d.memoryUsage) || 0;
        const storage = parseFloat(d.storage) || 0;
        const temp = parseFloat(d.temp) || 0;
        
        let latencyMs = 0;
        if (d.latency === "timeout") latencyMs = 999;
        else if (d.latency && typeof d.latency === 'string') {
          latencyMs = parseInt(d.latency.replace(/[^0-9]/g, ''), 10) || 0;
        }

        let issues = [];
        if (cpu > 85) issues.push(`CPU ${cpu}%`);
        if (ram > 85) issues.push(`RAM ${ram}%`);
        if (storage > 85) issues.push(`Storage ${storage}%`);
        if (temp > 60) issues.push(`Temp ${temp}°C`);
        if (latencyMs > 80) issues.push(`Ping ${latencyMs}ms`);

        if (issues.length > 0) {
          problemList.push({ name: d.name, circuit: d.circuitId, issues: issues.join(', ') });
        } else {
          onlineList.push(d);
        }
      });

      // ประกอบร่างข้อความ
      let msg = `📊 <b>รายงานสถานะระบบ (กลุ่ม: ${group.name})</b>\n\n`;
      msg += `📦 <b>อุปกรณ์ทั้งหมด:</b> ${devices.length} รายการ\n`;
      msg += `🟢 <b>Online:</b> ${onlineList.length} รายการ\n`;
      msg += `🔴 <b>Offline:</b> ${offlineList.length} รายการ\n`;
      msg += `⚠️ <b>Problem:</b> ${problemList.length} รายการ\n`;

      if (problemList.length > 0) {
        msg += `\n🚨 <b>อุปกรณ์ที่มีปัญหา:</b>\n`;
        problemList.forEach(p => {
          msg += `- <code>${p.name}</code> (${p.circuit || '-'}): <i>${p.issues}</i>\n`;
        });
      }

      if (offlineList.length > 0) {
        msg += `\n🔌 <b>อุปกรณ์ที่ Offline:</b>\n`;
        offlineList.forEach(o => {
          msg += `- <code>${o.name}</code> (${o.circuitId || '-'})\n`;
        });
      }

      // ส่งกลับเข้า Telegram
      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    }
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
  }
};