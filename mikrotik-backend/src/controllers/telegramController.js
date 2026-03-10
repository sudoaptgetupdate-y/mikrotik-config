const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); 

// ==========================================
// 🛠 Helper Functions
// ==========================================
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

const getAlertThresholds = async () => {
  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; // ค่า Default
  try {
    const setting = await prisma.systemSetting.findFirst({ where: { key: 'ALERT_THRESHOLDS' } });
    
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      thresholds = { ...thresholds, ...parsed }; 
    }
  } catch (error) {
    console.error("⚠️ ไม่สามารถดึงค่า Thresholds ได้ ใช้ค่า Default แทน", error);
  }
  return thresholds;
};

const getOfflineMinutes = (lastSeen) => {
  if (!lastSeen) return 9999;
  return (new Date() - new Date(lastSeen)) / 1000 / 60;
};

const formatTimeAgo = (minutes) => {
  if (minutes > 1440) return `${Math.floor(minutes / 1440)} วัน`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} ชม. ${Math.floor(minutes % 60)} นาที`;
  return `${Math.floor(minutes)} นาที`;
};

const generateGroupReportText = (group, isDaily = false, thresholds) => {
  const devices = group.devices || [];
  
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

    // แยกเครื่องปกติ กับเครื่องที่มีปัญหา
    if (issues.length > 0) {
      const problemData = { name: d.name, circuit: d.circuitId, issues: issues.join(', ') };
      if (d.isAcknowledged) warningAck.push(problemData);
      else warningUnack.push(problemData);
    } else {
      onlineHealthy.push(d);
    }
  });

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
// 🎯 API: จัดการ Webhook (รับคำสั่งจาก Telegram)
// ==========================================
exports.handleWebhook = async (req, res) => {
  // ตอบกลับ Telegram ทันทีเพื่อไม่ให้ระบบมันมองว่า Timeout
  res.sendStatus(200);

  let chatId, text;

  // 🟢 แยกประเภท: พิมพ์ข้อความปกติ หรือ กดปุ่ม (callback_query)
  if (req.body.message && req.body.message.text) {
    chatId = req.body.message.chat.id.toString();
    text = req.body.message.text.trim();
  } else if (req.body.callback_query) {
    chatId = req.body.callback_query.message.chat.id.toString();
    text = req.body.callback_query.data.trim();
  } else {
    return;
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

    // --- 🟢 คำสั่ง /help, /hi, /start, /menu (เมนูหลัก) ---
    if (['/help', '/hi', '/start', '/menu'].includes(command) || command.startsWith('/help@')) {
      let msg = `👋 <b>สวัสดีครับ! ระบบจัดการ Network พร้อมให้บริการ</b>\n`;
      msg += `กรุณาจิ้มเลือกดูข้อมูลจากเมนูด้านล่างได้เลยครับ 👇\n\n`;
      
      // อธิบายการใช้งาน /status ให้ผู้ใช้ทราบ
      msg += `🔍 <b>ต้องการดูสถานะเฉพาะเครื่อง?</b>\n`;
      msg += `พิมพ์คำสั่ง <code>/status [ชื่อ หรือ Circuit ID]</code>\n`;
      msg += `<i>ตัวอย่าง: <code>/status โรงเรียนxxx</code> หรือ <code>/status 7534j</code></i>`;

      // 🟢 สร้างปุ่มกด (จัดเรียงเป็น 2 แถว)
      const mainMenuKeyboard = [
        [
          { text: "🔴 ดูเครื่องออฟไลน์", callback_data: "/offline" },
          { text: "⚠️ ดูเครื่องมีปัญหา", callback_data: "/problem" }
        ],
        [
          { text: "📊 รายงานภาพรวม", callback_data: "/report" },
          { text: "🔥 จัดอันดับ Top 5", callback_data: "/top" }
        ]
      ];

      // ส่งข้อความพร้อมแนบปุ่มเมนูไป
      await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: mainMenuKeyboard });
      return;
    }

    // --- คำสั่ง /report ---
    if (command === '/report' || command.startsWith('/report@')) {
      const msg = generateGroupReportText(group, false, thresholds);
      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- คำสั่ง /offline ---
    if (command === '/offline' || command.startsWith('/offline@')) {
      const offlineDevices = devices.filter(d => getOfflineMinutes(d.lastSeen) > 3);

      if (offlineDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "🟢 <b>สถานะปกติ:</b> ไม่มีอุปกรณ์ใด Offline ในขณะนี้ครับ");
        return;
      }

      offlineDevices.sort((a, b) => getOfflineMinutes(b.lastSeen) - getOfflineMinutes(a.lastSeen));

      let msg = `🔴 <b>สรุปอุปกรณ์ที่ขาดการติดต่อ (Offline)</b>\n`;
      msg += `พบจำนวน: <b>${offlineDevices.length}</b> อุปกรณ์\n\n`;

      offlineDevices.forEach((d, index) => {
        const mins = getOfflineMinutes(d.lastSeen);
        const timeStr = d.lastSeen ? formatTimeAgo(mins) : "ไม่เคยเชื่อมต่อ";
        msg += `${index + 1}. <b>${d.name}</b>\n   ├ 🆔 วงจร: <code>${d.circuitId || '-'}</code>\n   └ ⏱️ หายไป: <i>${timeStr}</i>\n\n`;
      });

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- 🟢 คำสั่ง /status (อัปเกรดให้รองรับปุ่มกดแบบไม่วนลูป) ---
    if (command === '/status' || command.startsWith('/status@')) {
      const searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
      
      if (!searchKeyword) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>รูปแบบคำสั่งผิด:</b> กรุณาระบุชื่อ หรือ Circuit ID\nตัวอย่าง: <code>/status องค์การ</code>");
        return;
      }

      let matchedDevices = [];

      // เช็คว่ามีสัญลักษณ์ลับจากปุ่มกดหรือไม่ (เช่น "_id_36")
      if (searchKeyword.startsWith('_id_')) {
        const targetId = searchKeyword.replace('_id_', '');
        // ค้นหาแบบเจาะจง ID เท่านั้น
        const exactDevice = devices.find(d => d.id.toString() === targetId);
        if (exactDevice) matchedDevices.push(exactDevice);
      } else {
        // ถ้าเป็นการพิมพ์ข้อความปกติ ให้ค้นหาจากชื่อ หรือ Circuit ID
        matchedDevices = devices.filter(d => {
          const matchCircuit = d.circuitId && d.circuitId.toLowerCase().includes(searchKeyword);
          const matchName = d.name && d.name.toLowerCase().includes(searchKeyword);
          return matchCircuit || matchName;
        });
      }

      if (matchedDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ ไม่พบอุปกรณ์ที่ตรงกับ: <b>${searchKeyword.replace('_id_', '')}</b>`);
        return;
      }

      // กรณีค้นเจอหลายตัว -> สร้างปุ่มกดให้เลือก
      if (matchedDevices.length > 1) {
        let msg = `⚠️ <b>พบอุปกรณ์หลายตัวที่ตรงกับ "${searchKeyword}"</b>\nกรุณาคลิกเลือกอุปกรณ์ที่ต้องการ:\n`;

        const inlineKeyboard = matchedDevices.slice(0, 10).map(d => {
          return [{
            text: `📱 ${d.name} (${d.circuitId || '-'})`,
            callback_data: `/status _id_${d.id}` 
          }];
        });

        await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: inlineKeyboard });
        return;
      }

      // กรณีเจอตัวเดียว (หรือคลิกเลือกมาจากปุ่มแล้ว) -> แสดงผลลัพธ์ทันที
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

    // --- คำสั่ง /problem ---
    if (command === '/problem' || command.startsWith('/problem@')) {
      const problemDevices = devices.filter(d => {
        if (d.isAcknowledged) return false; // ข้ามตัวที่รับทราบแล้ว
        
        const isOffline = getOfflineMinutes(d.lastSeen) > 3;
        const isCpuHigh = (parseFloat(d.cpuLoad) || 0) > thresholds.cpu;
        const isRamHigh = (parseFloat(d.memoryUsage) || 0) > thresholds.ram;
        
        if (isOffline) d.issue = "🔴 Offline";
        else if (isCpuHigh) d.issue = `🟠 CPU สูง (${d.cpuLoad}%)`;
        else if (isRamHigh) d.issue = `🟠 RAM สูง (${d.memoryUsage}%)`;

        return isOffline || isCpuHigh || isRamHigh;
      });

      if (problemDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b>ยอดเยี่ยม!</b> ไม่มีอุปกรณ์ที่มีปัญหาตกค้างในระบบครับ");
        return;
      }

      let msg = `⚠️ <b>อุปกรณ์ที่มีปัญหา (ยังไม่มีผู้รับทราบ)</b>\n`;
      msg += `พบจำนวน: <b>${problemDevices.length}</b> เคส\n\n`;

      problemDevices.forEach((d, index) => {
        msg += `${index + 1}. <b>${d.name}</b> (<code>${d.circuitId || '-'}</code>)\n   └ ปัญหา: ${d.issue}\n`;
      });

      msg += `\n<i>(เข้าหน้าเว็บเพื่อกด Acknowledge และอัปเดตสถานะ)</i>`;
      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- คำสั่ง /top ---
    if (command === '/top' || command.startsWith('/top@')) {
      const onlineDevices = devices.filter(d => getOfflineMinutes(d.lastSeen) <= 3);

      if (onlineDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ ไม่มีอุปกรณ์ที่ Online อยู่ในขณะนี้ให้จัดอันดับครับ");
        return;
      }

      // เรียงตาม CPU มากไปน้อย
      onlineDevices.sort((a, b) => {
        const cpuA = parseFloat(a.cpuLoad) || 0;
        const cpuB = parseFloat(b.cpuLoad) || 0;
        const ramA = parseFloat(a.memoryUsage) || 0;
        const ramB = parseFloat(b.memoryUsage) || 0;
        
        if (cpuB === cpuA) return ramB - ramA;
        return cpuB - cpuA;
      });

      const top5 = onlineDevices.slice(0, 5);

      let msg = `🔥 <b>Top 5 อุปกรณ์กินทรัพยากรสูงสุด</b>\n\n`;
      
      top5.forEach((d, index) => {
        const cpu = parseFloat(d.cpuLoad) || 0;
        const cpuIcon = (cpu > thresholds.cpu) ? '🔴' : (cpu > 60) ? '🟠' : '🟢';
        msg += `${index + 1}. <b>${d.name}</b>\n`;
        msg += `   └ ${cpuIcon} CPU: <b>${cpu}%</b> | RAM: ${d.memoryUsage || 0}%\n`;
      });

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

  } catch (error) {
    console.error("Telegram Webhook Error:", error);
  }
};

// ==========================================
// ⏰ Cron Jobs
// ==========================================
exports.initDailyReportCron = () => {
  cron.schedule('30 7 * * *', async () => {
    console.log("⏰ [CRON] Starting Daily Telegram Report...");

    try {
      const groups = await prisma.deviceGroup.findMany({
        where: {
          isNotifyEnabled: true,
          telegramBotToken: { not: null },
          telegramChatId: { not: null }
        },
        include: { devices: { where: { status: { not: 'DELETED' } } } }
      });

      if (groups.length > 0) {
        const thresholds = await getAlertThresholds();

        for (const group of groups) {
          if (group.devices && group.devices.length > 0) {
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

exports.initRealtimeMonitorCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);

      const deadDevices = await prisma.managedDevice.findMany({
        where: {
          status: { not: 'DELETED' },
          lastSeen: { lt: threeMinsAgo },
          isOfflineAlerted: false 
        },
        include: { groups: true }
      });

      for (const device of deadDevices) {
        let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};

        await prisma.deviceEventLog.create({
          data: { deviceId: device.id, eventType: 'OFFLINE', details: 'Device went offline (No heartbeat for > 3 mins)' }
        });

        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
            const msg = `🔴 <b>[DEVICE OFFLINE]</b>\nขาดการติดต่อจากอุปกรณ์เกิน 3 นาที!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⏳ <b>ติดต่อล่าสุด:</b> ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}${adminInfo}`;

            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }

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