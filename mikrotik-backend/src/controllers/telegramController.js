const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); 

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
// 🛠 Helper: ฟังก์ชันดึงค่า Thresholds จาก DB
// ==========================================
const getAlertThresholds = async () => {
  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; // ค่า Default เผื่อ DB พัง
  try {
    const setting = await prisma.setting.findFirst({ where: { key: 'ALERT_THRESHOLDS' } });
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      thresholds = { ...thresholds, ...parsed }; // เอาค่าจาก DB ทับค่า Default
    }
  } catch (error) {
    console.error("⚠️ ไม่สามารถดึงค่า Thresholds ได้ ใช้ค่า Default แทน", error);
  }
  return thresholds;
};

// ==========================================
// 🛠 Helper Function: สร้างข้อความ Report
// ==========================================
const generateGroupReportText = (group, isDaily = false, thresholds) => {
  const devices = group.devices || [];
  
  // แบ่งหมวดหมู่ให้ละเอียดขึ้นตามสถานะ Ack
  let onlineHealthy = [];
  let warningUnack = [];
  let warningAck = [];
  let offlineUnack = [];
  let offlineAck = [];

  devices.forEach(d => {
    // 1. ตรวจสอบสถานะ Offline
    const diffMinutes = d.lastSeen ? (new Date() - new Date(d.lastSeen)) / 1000 / 60 : 999;
    if (diffMinutes > 3) {
      if (d.isAcknowledged) offlineAck.push(d);
      else offlineUnack.push(d);
      return;
    }

    // 2. ตรวจสอบสถานะ Warning
    const cpu = parseFloat(d.cpu || d.cpuLoad) || 0;
    const ram = parseFloat(d.ram || d.memoryUsage) || 0;
    const storage = parseFloat(d.storage) || 0;
    const temp = parseFloat(d.temp) || 0;
    const latencyMs = parseLatencyToMs(d.latency);

    let issues = [];
    if (cpu > thresholds.cpu) issues.push(`CPU ${cpu}%`);
    if (ram > thresholds.ram) issues.push(`RAM ${ram}%`);
    if (storage > thresholds.storage) issues.push(`Storage ${storage}%`);
    if (temp > thresholds.temp) issues.push(`Temp ${temp}°C`);
    if (latencyMs > thresholds.latency) issues.push(`Ping ${latencyMs}ms`);

    // แยกเครื่องปกติ กับเครื่องที่มีปัญหา (และดูว่า Ack หรือยัง)
    if (issues.length > 0) {
      const problemData = { name: d.name, circuit: d.circuitId, issues: issues.join(', ') };
      if (d.isAcknowledged) warningAck.push(problemData);
      else warningUnack.push(problemData);
    } else {
      onlineHealthy.push(d);
    }
  });

  // คำนวณตัวเลขรวม
  const totalWarning = warningUnack.length + warningAck.length;
  const totalOnline = onlineHealthy.length + totalWarning;
  const totalOffline = offlineUnack.length + offlineAck.length;

  // ==============================
  // ส่วนที่ 1: ประกอบข้อความ Header & สรุปตัวเลข
  // ==============================
  const title = isDaily ? "🗓️ <b>รายงานสถานะระบบประจำวัน</b>" : "📊 <b>รายงานสถานะระบบ</b>";
  let msg = `${title}\n(กลุ่ม: ${group.name})\n\n`;
  
  msg += `📦 <b>อุปกรณ์ทั้งหมด: ${devices.length} รายการ</b>\n`;
  
  // สรุป Online (Nested)
  msg += `🟢 <b>Online: ${totalOnline} รายการ</b>\n`;
  msg += `      ├─ ✅ ทำงานปกติ: ${onlineHealthy.length}\n`;
  msg += `      └─ ⚠️ พบปัญหา: ${totalWarning} ${warningAck.length > 0 ? `<i>(Ack แล้ว ${warningAck.length})</i>` : ''}\n`;
  
  // สรุป Offline (Nested)
  msg += `🔴 <b>Offline: ${totalOffline} รายการ</b>\n`;
  if (totalOffline > 0) {
    msg += `      ├─ 🚨 ยังไม่รับทราบ: ${offlineUnack.length}\n`;
    msg += `      └─ ⌛ รับทราบแล้ว: ${offlineAck.length}\n`;
  }

  msg += `\n`;

  // ==============================
  // ส่วนที่ 2: รายละเอียด (แบ่งกลุ่มตามการ Action)
  // ==============================
  
  // กลุ่มแดง: ต้องลงมือทำทันที (Unacked ทั้งหมด)
  msg += `🚨 <b>อุปกรณ์ที่พบปัญหา (ต้องตรวจสอบด่วน):</b>\n`;
  if (warningUnack.length === 0 && offlineUnack.length === 0) {
    msg += `✅ <i>ไม่พบอุปกรณ์ที่มีปัญหา (ที่ยังไม่ได้รับทราบ)</i>\n`;
  } else {
    // เอา Offline ที่ยังไม่รับทราบ ขึ้นก่อน (เพราะด่วนกว่า)
    offlineUnack.forEach(o => {
      msg += `🔻 <b>${o.name}</b> (${o.circuitId || '-'}): <i>[OFFLINE] ขาดการติดต่อ</i>\n`;
    });
    // ตามด้วย Warning ที่ยังไม่รับทราบ
    warningUnack.forEach(p => {
      msg += `🔻 <b>${p.name}</b> (${p.circuit || '-'}): <i>${p.issues}</i>\n`;
    });
  }

  // กลุ่มส้ม: มีคนรับผิดชอบแล้ว (Acked ทั้งหมด)
  if (warningAck.length > 0 || offlineAck.length > 0) {
    msg += `\n⌛ <b>อุปกรณ์ที่รับทราบปัญหาแล้ว (กำลังดำเนินการ):</b>\n`;
    offlineAck.forEach(o => {
      msg += `🔸 <b>${o.name}</b> (${o.circuitId || '-'}): <i>[OFFLINE] ขาดการติดต่อ</i>\n`;
    });
    warningAck.forEach(a => {
      msg += `🔸 <b>${a.name}</b> (${a.circuit || '-'}): <i>${a.issues}</i>\n`;
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
      // 🟢 ดึงค่า Thresholds ก่อนสร้างข้อความ
      const thresholds = await getAlertThresholds();
      const msg = generateGroupReportText(group, false, thresholds);
      
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
  cron.schedule('30 7 * * *', async () => {
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

      if (groups.length > 0) {
        // 🟢 2. ดึงค่า Thresholds แค่รอบเดียวเพื่อใช้งานกับทุกกลุ่ม (ลดภาระ Database)
        const thresholds = await getAlertThresholds();

        // 3. วนลูปส่งรายงานให้แต่ละกลุ่ม
        for (const group of groups) {
          if (group.devices && group.devices.length > 0) {
            // ส่ง Thresholds เข้าไปคำนวณด้วย
            const msg = generateGroupReportText(group, true, thresholds);
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
      console.log("✅ [CRON] Daily Telegram Report Sent Successfully.");
    } catch (error) {
      console.error("❌ [CRON] Daily Telegram Report Error:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok" 
  });

  console.log("🕒 Telegram Daily Report Scheduled: 07:30 AM (Asia/Bangkok)");
};

// ==========================================
// ⏰ Cron Job: ตรวจสอบอุปกรณ์ Offline (ทำงานทุก 1 นาที)
// ==========================================
exports.initRealtimeMonitorCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      // คำนวณเวลาย้อนหลังไป 3 นาที
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);

      // ค้นหาอุปกรณ์ที่ยัง Active, ขาดการติดต่อนานกว่า 3 นาที และ "ยังไม่เคยแจ้งเตือน Offline"
      const deadDevices = await prisma.managedDevice.findMany({
        where: {
          status: { not: 'DELETED' },
          lastSeen: { lt: threeMinsAgo },
          isOfflineAlerted: false 
        },
        include: { groups: true }
      });

      for (const device of deadDevices) {
        // 1. อัปเดตฐานข้อมูลว่า "เตือน Offline ไปแล้วนะ"
        await prisma.managedDevice.update({
          where: { id: device.id },
          data: { isOfflineAlerted: true, isAcknowledged: false } // ปลด Ack เผื่อมีค้างไว้
        });

        // 2. บันทึกประวัติ
        await prisma.deviceEventLog.create({
          data: { 
            deviceId: device.id, 
            eventType: 'OFFLINE', 
            details: 'Device went offline (No heartbeat for > 3 mins)' 
          }
        });

        // 3. ยิง Telegram แจ้งเตือน
        const msg = `🔴 <b>[DEVICE OFFLINE]</b>\nขาดการติดต่อจากอุปกรณ์เกิน 3 นาที!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⏳ <b>ติดต่อล่าสุด:</b> ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}`;

        // 3. ยิง Telegram แจ้งเตือน
        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            // ดึงชื่อและเบอร์โทรแอดมินมาแสดง
            const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
            
            const msg = `🚨 <b>[DEVICE OFFLINE] - ขาดการติดต่อ</b>\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⚠️ <b>สถานะ:</b> ไม่สามารถเชื่อมต่อได้เกิน 3 นาที (อาจเกิดจากไฟดับหรืออินเทอร์เน็ตหลุด)${adminInfo}`;

            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Offline Monitor Cron Error:", error);
    }
  });

  console.log("🕒 Real-time Offline Monitor Scheduled (Every 1 minute)");
};