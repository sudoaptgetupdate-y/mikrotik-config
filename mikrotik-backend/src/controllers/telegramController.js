const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');

// ✅ นำฟังก์ชันแปลงหน่วย Ping เข้ามาใช้ เพื่อให้รายงานผลตรงกับหน้าเว็บ
const parseLatencyToMs = (latencyStr) => {
  if (!latencyStr || latencyStr === "timeout") return 999;
  const str = String(latencyStr).toLowerCase();
  
  if (str.includes(':')) {
    const parts = str.split(':');
    const secAndMs = parts[parts.length - 1];
    if (secAndMs.includes('.')) {
      const [sec, frac] = secAndMs.split('.');
      return (parseInt(sec, 10) * 1000) + parseInt(frac.padEnd(3, '0').substring(0,3), 10);
    }
    return parseInt(secAndMs, 10) * 1000;
  }
  
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;
  if (str.includes('us')) return Math.round(num / 1000);
  if (str.includes('s') && !str.includes('ms')) return Math.round(num * 1000);
  return Math.round(num);
};

exports.handleWebhook = async (req, res) => {
  res.sendStatus(200);

  const message = req.body.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    // 🌟 แก้ไข: ใช้ prisma.deviceGroup ให้ตรงกับชื่อ Schema ของคุณ
    const group = await prisma.deviceGroup.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } 
    });

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

      devices.forEach(d => {
        const diffMinutes = d.lastSeen ? (new Date() - new Date(d.lastSeen)) / 1000 / 60 : 999;
        if (diffMinutes > 3) {
          offlineList.push(d);
          return;
        }

        const cpu = parseFloat(d.cpuLoad) || 0;
        const ram = parseFloat(d.memoryUsage) || 0;
        const storage = parseFloat(d.storage) || 0;
        const temp = parseFloat(d.temp) || 0;
        
        // 🌟 แก้ไข: ใช้ฟังก์ชัน parseLatencyToMs เพื่อให้แสดงผลถูกต้อง
        const latencyMs = parseLatencyToMs(d.latency);

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

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    }
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
  }
};