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
  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; // ค่า Default
  try {
    const setting = await prisma.systemSetting.findFirst({ where: { key: 'ALERT_THRESHOLDS' } });
    
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
// 🛠 Helper: ฟังก์ชันคำนวณเวลา (นาที) และข้อความ
// ==========================================
const getOfflineMinutes = (lastSeen) => {
  if (!lastSeen) return 9999;
  return (new Date() - new Date(lastSeen)) / 1000 / 60;
};

const formatTimeAgo = (minutes) => {
  if (minutes > 1440) return `${Math.floor(minutes / 1440)} วัน`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} ชม. ${Math.floor(minutes % 60)} นาที`;
  return `${Math.floor(minutes)} นาที`;
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

  const title = isDaily ? "🗓️ <b>รายงานสถานะระบบประจำวัน</b>" : "📊 <b>รายงานสถานะระบบ</b>";
  let msg = `${title}\n(กลุ่ม: ${group.name})\n\n`;
  
  msg += `📦 <b>อุปกรณ์ทั้งหมด: ${devices.length} รายการ</b>\n`;
  msg += `🟢 <b>Online: ${totalOnline} รายการ</b>\n`;
  msg += `      ├─ ✅ ทำงานปกติ: ${onlineHealthy.length}\n`;
  msg += `      └─ ⚠️ พบปัญหา: ${totalWarning} ${warningAck.length > 0 ? `<i>(Ack แล้ว ${warningAck.length})</i>` : ''}\n`;
  
  msg += `🔴 <b>Offline: ${totalOffline} รายการ</b>\n`;
  if (totalOffline > 0) {
    msg += `      ├─ 🚨 ยังไม่รับทราบ: ${offlineUnack.length}\n`;
    msg += `      └─ ⌛ รับทราบแล้ว: ${offlineAck.length}\n`;
  }

  msg += `\n`;
  
  msg += `🚨 <b>อุปกรณ์ที่พบปัญหา (ต้องตรวจสอบด่วน):</b>\n`;
  if (warningUnack.length === 0 && offlineUnack.length === 0) {
    msg += `✅ <i>ไม่พบอุปกรณ์ที่มีปัญหา (ที่ยังไม่ได้รับทราบ)</i>\n`;
  } else {
    offlineUnack.forEach(o => {
      msg += `🔻 <b>${o.name}</b> (${o.circuitId || '-'}): <i>[OFFLINE] ขาดการติดต่อ</i>\n`;
    });
    warningUnack.forEach(p => {
      msg += `🔻 <b>${p.name}</b> (${p.circuit || '-'}): <i>${p.issues}</i>\n`;
    });
  }

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
// 🎯 API: จัดการ Webhook (จากคำสั่งพิมพ์เอง และ ปุ่มกด)
// ==========================================
exports.handleWebhook = async (req, res) => {
  // ตอบกลับ Telegram ทันทีเพื่อไม่ให้ระบบมันมองว่า Timeout
  res.sendStatus(200);

  let chatId, text;

  // 🟢 1. แยกประเภท: พิมพ์ข้อความปกติ หรือ กดปุ่ม (callback_query)
  if (req.body.message && req.body.message.text) {
    chatId = req.body.message.chat.id.toString();
    text = req.body.message.text.trim();
  } else if (req.body.callback_query) {
    // ดึงข้อมูลจากการกดปุ่ม (เช่น "/status 15")
    chatId = req.body.callback_query.message.chat.id.toString();
    text = req.body.callback_query.data.trim();
  } else {
    return; // ถ้าเป็นรูปภาพ หรือสติ๊กเกอร์ ให้ข้ามไป
  }

  const args = text.split(' ');
  const command = args[0].toLowerCase();

  try {
    const group = await prisma.deviceGroup.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } 
    });

    if (!group || !group.telegramBotToken) return;
    const devices = group.devices || [];
    const thresholds = await getAlertThresholds();

    // --- คำสั่ง /help ---
    // (โค้ด /help เดิมของคุณ...)
    if (command === '/help' || command.startsWith('/help@')) {
      let helpMsg = `🤖 <b>คำสั่งที่รองรับ:</b>\n\n`;
      helpMsg += `/report - สรุปภาพรวมของระบบทั้งหมด\n`;
      helpMsg += `/offline - ดูรายชื่ออุปกรณ์ที่ดับไป\n`;
      helpMsg += `/problem - ดูอุปกรณ์ที่มีปัญหา (ยังไม่ได้รับทราบ)\n`;
      helpMsg += `/top - จัดอันดับอุปกรณ์กินทรัพยากร 5 อันดับแรก\n`;
      helpMsg += `/status [ชื่อ หรือ CircuitID] - ดูข้อมูลเชิงลึก\n`;
      await sendTelegramAlert(group.telegramBotToken, chatId, helpMsg);
      return;
    }

    // --- คำสั่ง /report, /offline, /problem, /top คงไว้เหมือนเดิมได้เลยครับ ---
    // ...

    // --- 🟢 คำสั่ง /status (อัปเกรดให้รองรับปุ่มกด) ---
    if (command === '/status' || command.startsWith('/status@')) {
      const searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
      
      if (!searchKeyword) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>รูปแบบคำสั่งผิด:</b> กรุณาระบุชื่อ หรือ Circuit ID\nตัวอย่าง: <code>/status องค์การ</code>");
        return;
      }

      // 🟢 ค้นหาจากชื่อ, Circuit ID, หรือ Database ID (จากการกดปุ่ม)
      const matchedDevices = devices.filter(d => {
        const matchCircuit = d.circuitId && d.circuitId.toLowerCase().includes(searchKeyword);
        const matchName = d.name && d.name.toLowerCase().includes(searchKeyword);
        const matchId = d.id.toString() === searchKeyword; // รองรับกรณีค้นหาด้วย ID ที่ฝังไว้ในปุ่ม
        return matchCircuit || matchName || matchId;
      });

      if (matchedDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ ไม่พบอุปกรณ์ที่ตรงกับ: <b>${searchKeyword}</b>`);
        return;
      }

      // 🟢 กรณีค้นเจอหลายตัว -> สร้างปุ่มกดให้เลือก (Inline Keyboard)
      if (matchedDevices.length > 1) {
        let msg = `⚠️ <b>พบอุปกรณ์หลายตัวที่ตรงกับ "${searchKeyword}"</b>\nกรุณาคลิกเลือกอุปกรณ์ที่ต้องการ:\n`;

        // สร้างปุ่มกด (แสดงสูงสุด 10 ปุ่ม เพื่อไม่ให้แชทรกลงมาเกินไป)
        const inlineKeyboard = matchedDevices.slice(0, 10).map(d => {
          return [{
            text: `📱 ${d.name} (${d.circuitId || '-'})`,
            // 🟢 ฝังคำสั่งพร้อม ID ของอุปกรณ์ตัวนั้นลงไปในปุ่ม
            callback_data: `/status ${d.id}` 
          }];
        });

        // ส่งข้อความพร้อมปุ่มไปให้ผู้ใช้
        await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: inlineKeyboard });
        return;
      }

      // 🟢 กรณีเจอตัวเดียว (หรือคลิกเลือกมาจากปุ่มแล้ว) -> แสดงผลลัพธ์ทันที
      const device = matchedDevices[0];
      const isOffline = getOfflineMinutes(device.lastSeen) > 3;
      const statusIcon = isOffline ? '🔴 Offline' : '🟢 Online';

      let msg = `📊 <b>สถานะอุปกรณ์แบบ Real-time</b>\n`;
      msg += `<b>ชื่อ:</b> ${device.name}\n`;
      msg += `<b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n`;
      msg += `<b>IP:</b> <code>${device.currentIp}</code>\n`;
      msg += `<b>สถานะ:</b> ${statusIcon}\n`;
      msg += `<b>รุ่น:</b> ${device.boardName || '-'} (v${device.version || '-'})\n\n`;

      if (isOffline) {
        const timeStr = device.lastSeen ? formatTimeAgo(getOfflineMinutes(device.lastSeen)) : "ไม่เคยเชื่อมต่อ";
        msg += `⚠️ <i>ขาดการติดต่อไปตั้งแต่: ${timeStr} ที่แล้ว</i>`;
      } else {
        const latencyMs = device.latency && device.latency !== "timeout" ? parseLatencyToMs(device.latency) + 'ms' : 'timeout';

        msg += `🧠 <b>CPU:</b> ${device.cpuLoad || 0}% | 💾 <b>RAM:</b> ${device.memoryUsage || 0}%\n`;
        msg += `🌡️ <b>Temp:</b> ${device.temp || 'N/A'}\n`;
        msg += `📡 <b>Ping:</b> ${latencyMs}\n`;
        msg += `⏱️ <b>Uptime:</b> ${device.uptime || '-'}`;
      }

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
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
        // 🟢 1. ดึงข้อมูล Message ID เดิมออกมาก่อน
        let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};

        await prisma.deviceEventLog.create({
          data: { deviceId: device.id, eventType: 'OFFLINE', details: 'Device went offline (No heartbeat for > 3 mins)' }
        });

        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
            const msg = `🔴 <b>[DEVICE OFFLINE]</b>\nขาดการติดต่อจากอุปกรณ์เกิน 3 นาที!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⏳ <b>ติดต่อล่าสุด:</b> ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}${adminInfo}`;

            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              // 🟢 2. ยิงข้อความไป แล้วเอา Message ID มาเซฟไว้
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }

        // 🟢 3. อัปเดตฐานข้อมูล (พร้อมเซฟ lastAlertMessageIds)
        await prisma.managedDevice.update({
          where: { id: device.id },
          data: { isOfflineAlerted: true, isAcknowledged: false, lastAlertMessageIds: alertMsgIds } 
        });
      }
    } catch (error) {
      console.error("❌ Offline Monitor Cron Error:", error);
    }
  });

  console.log("🕒 Real-time Offline Monitor Scheduled (Every 1 minute)");
};