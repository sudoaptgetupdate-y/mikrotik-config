const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); // ✅ นำเข้า node-cron สำหรับทำ Schedule

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

// ==========================================
// 🛠 Helper Function: สร้างข้อความ Report
// ==========================================
const generateGroupReportText = (group, isDaily = false) => {
  const devices = group.devices || [];
  
  let onlineList = [];
  let offlineList = [];
  let problemList = [];
  let ackList = [];

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
    const latencyMs = parseLatencyToMs(d.latency);

    let issues = [];
    if (cpu > 85) issues.push(`CPU ${cpu}%`);
    if (ram > 85) issues.push(`RAM ${ram}%`);
    if (storage > 85) issues.push(`Storage ${storage}%`);
    if (temp > 60) issues.push(`Temp ${temp}°C`);
    if (latencyMs > 80) issues.push(`Ping ${latencyMs}ms`);

    if (issues.length > 0) {
      const problemData = { name: d.name, circuit: d.circuitId, issues: issues.join(', ') };
      if (d.isAcknowledged) {
        ackList.push(problemData);
      } else {
        problemList.push(problemData);
      }
    } else {
      onlineList.push(d);
    }
  });

  // ประกอบข้อความ
  const title = isDaily ? "🗓️ <b>รายงานสถานะระบบประจำวัน</b>" : "📊 <b>รายงานสถานะระบบ</b>";
  let msg = `${title} (กลุ่ม: ${group.name})\n\n`;
  msg += `📦 <b>อุปกรณ์ทั้งหมด:</b> ${devices.length} รายการ\n`;
  msg += `🟢 <b>Online:</b> ${onlineList.length} รายการ\n`;
  msg += `🔴 <b>Offline:</b> ${offlineList.length} รายการ\n`;
  msg += `⚠️ <b>Problem:</b> ${problemList.length} รายการ\n`;
  msg += `⌛ <b>Problem Ack:</b> ${ackList.length} รายการ\n`;

  msg += `\n🚨 <b>อุปกรณ์ที่มีปัญหา:</b>\n`;
  if (problemList.length > 0) {
    problemList.forEach(p => {
      msg += `🔻 <b>${p.name}</b> (${p.circuit || '-'}): <i>${p.issues}</i>\n`;
    });
  } else {
    msg += `✅ <i>ไม่พบอุปกรณ์ที่มีปัญหา</i>\n`;
  }

  if (ackList.length > 0) {
    msg += `\n⌛ <b>อุปกรณ์ที่ผู้ดูแลรับทราบปัญหาแล้ว:</b>\n`;
    ackList.forEach(a => {
      msg += `🔸 <b>${a.name}</b> (${a.circuit || '-'}): <i>${a.issues}</i>\n`;
    });
  }

  if (offlineList.length > 0) {
    msg += `\n🔌 <b>อุปกรณ์ที่ Offline:</b>\n`;
    offlineList.forEach(o => {
      msg += `▪️ <b>${o.name}</b> (${o.circuitId || '-'})\n`;
    });
  }

  return msg;
};

// ==========================================
// 🎯 API: จัดการ Webhook (จากคำสั่งพิมพ์เอง)
// ==========================================
exports.handleWebhook = async (req, res) => {
  res.sendStatus(200);

  const message = req.body.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    const group = await prisma.deviceGroup.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } 
    });

    if (!group || !group.telegramBotToken) return;

    if (text === '/help' || text.startsWith('/help@')) {
      const helpMsg = `🤖 <b>คำสั่งที่รองรับ:</b>\n\n/report - สรุปสถานะอุปกรณ์ทั้งหมดในกลุ่มนี้\n/help - ดูคำสั่งทั้งหมด`;
      await sendTelegramAlert(group.telegramBotToken, chatId, helpMsg);
      return;
    }

    if (text === '/report' || text.startsWith('/report@')) {
      // ✅ เรียกใช้ Helper Function เพื่อสร้างข้อความ
      const msg = generateGroupReportText(group, false);
      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    }
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
  }
};

// ==========================================
// ⏰ Cron Job: ส่งรายงานอัตโนมัติ 07:30 ทุกวัน
// ==========================================
exports.initDailyReportCron = () => {
  // เวลา '30 7 * * *' หมายถึง 07:30 น. ของทุกวัน
  cron.schedule('* * * * *', async () => {
    console.log("⏰ [CRON] Starting Daily Telegram Report...");

    try {
      // 1. ดึงข้อมูล Group ทั้งหมดที่เปิดแจ้งเตือนไว้
      const groups = await prisma.deviceGroup.findMany({
        where: {
          isNotifyEnabled: true,
          telegramBotToken: { not: null },
          telegramChatId: { not: null }
        },
        include: { devices: { where: { status: { not: 'DELETED' } } } }
      });

      // 2. วนลูปส่งรายงานให้แต่ละกลุ่ม
      for (const group of groups) {
        if (group.devices && group.devices.length > 0) {
          const msg = generateGroupReportText(group, true);
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
          
          // ชะลอเวลาเล็กน้อย ป้องกัน Telegram API แบน (Rate limit) กรณีมีหลายกลุ่ม
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      console.log("✅ [CRON] Daily Telegram Report Sent Successfully.");
    } catch (error) {
      console.error("❌ [CRON] Daily Telegram Report Error:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok" // ✅ ล็อคโซนเวลาเป็นประเทศไทย (สำคัญมาก)
  });

  console.log("🕒 Telegram Daily Report Scheduled: 07:30 AM (Asia/Bangkok)");
};