const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); 

// ==========================================
// 🛠 Helper Functions
// ==========================================
const parseLatencyToMs = (latencyStr) => {
  if (!latencyStr || latencyStr === "timeout") return 999;
  if (latencyStr === "N/A") return 0;
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
  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 };
  try {
    // 🟢 1. ใช้ findUnique ได้อย่างปลอดภัยเพราะ schema คุณมี @unique อยู่แล้ว
    const setting = await prisma.systemSetting.findUnique({ 
      where: { key: 'ALERT_THRESHOLDS' }
    });
    
    if (setting && setting.value) {
      let parsed = setting.value;
      
      // 🟢 2. แกะ String วนไปเรื่อยๆ จนกว่าจะได้ Object (แก้ปัญหา Double Stringify)
      while (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          break; 
        }
      }

      // 🟢 3. บังคับเปลี่ยน Key ทั้งหมดเป็นตัวอักษรพิมพ์เล็ก (ป้องกันปัญหาพิมพ์ Temp, TEMP, temp)
      const safeParsed = {};
      if (parsed && typeof parsed === 'object') {
        for (const k in parsed) {
          safeParsed[k.toLowerCase()] = parsed[k];
        }
      }
      
      thresholds = {
        cpu: Number(safeParsed.cpu ?? thresholds.cpu),
        ram: Number(safeParsed.ram ?? safeParsed.memory ?? thresholds.ram),
        latency: Number(safeParsed.latency ?? safeParsed.ping ?? thresholds.latency),
        temp: Number(safeParsed.temp ?? safeParsed.temperature ?? thresholds.temp),
        storage: Number(safeParsed.storage ?? safeParsed.hdd ?? thresholds.storage),
      };
    }
  } catch (error) {
    console.error("⚠️ ไม่สามารถดึงค่า Thresholds ได้", error);
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

  const title = isDaily ? "🗓 <b>รายงานสถานะระบบประจำวัน</b>" : "📊 <b>รายงานสถานะระบบภาพรวม</b>";
  const separator = "━━━━━━━━━━━━━━━━━━";
  
  let msg = `${title}\n<code>กลุ่ม: ${group.name}</code>\n${separator}\n\n`;
  
  msg += `📍 <b><u>สรุปสถานะอุปกรณ์</u></b>\n`;
  msg += `📦 ทั้งหมด: <b>${devices.length}</b> รายการ\n`;
  msg += `🟢 Online: <b>${totalOnline}</b> รายการ\n`;
  msg += `      ├ ✅ ปกติ: <code>${onlineHealthy.length}</code>\n`;
  msg += `      └ ⚠️ ปัญหา: <code>${totalWarning}</code> ${warningAck.length > 0 ? `<i>(Ack: ${warningAck.length})</i>` : ''}\n`;
  
  msg += `🔴 Offline: <b>${totalOffline}</b> รายการ\n`;
  if (totalOffline > 0) {
    msg += `      ├ 🚨 ใหม่: <code>${offlineUnack.length}</code>\n`;
    msg += `      └ ⌛ รับทราบ: <code>${offlineAck.length}</code>\n`;
  }

  msg += `\n${separator}\n`;
  
  msg += `🚨 <b><u>ปัญหาที่ต้องตรวจสอบด่วน</u></b>\n`;
  if (warningUnack.length === 0 && offlineUnack.length === 0) {
    msg += `✅ <i>ระบบทำงานปกติ ไม่พบปัญหาใหม่</i>\n`;
  } else {
    offlineUnack.forEach(o => {
      msg += `• <b>${o.name}</b>\n  └ <code>[OFFLINE] ขาดการติดต่อ</code>\n`;
    });
    warningUnack.forEach(p => {
      msg += `• <b>${p.name}</b>\n  └ <code>⚠️ ${p.issues}</code>\n`;
    });
  }

  if (warningAck.length > 0 || offlineAck.length > 0) {
    msg += `\n⌛ <b><u>อยู่ระหว่างดำเนินการ (Ack)</u></b>\n`;
    offlineAck.forEach(o => {
      msg += `• <b>${o.name}</b>\n  └ <code>[OFFLINE] รับทราบแล้ว</code>\n`;
    });
    warningAck.forEach(a => {
      msg += `• <b>${a.name}</b>\n  └ <code>🔸 ${a.issues}</code>\n`;
    });
  }

  msg += `\n${separator}\n`;
  msg += `🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;

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
      const separator = "━━━━━━━━━━━━━━━━━━";

      if (offlineDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "🟢 <b>สถานะปกติ:</b>\nไม่มีอุปกรณ์ใด Offline ในขณะนี้ครับ");
        return;
      }

      offlineDevices.sort((a, b) => getOfflineMinutes(b.lastSeen) - getOfflineMinutes(a.lastSeen));

      let msg = `🔴 <b><u>สรุปอุปกรณ์ที่ Offline</u></b>\n`;
      msg += `พบทั้งหมด: <b>${offlineDevices.length}</b> รายการ\n${separator}\n\n`;

      offlineDevices.forEach((d, index) => {
        const mins = getOfflineMinutes(d.lastSeen);
        const timeStr = d.lastSeen ? formatTimeAgo(mins) : "ไม่เคยเชื่อมต่อ";
        msg += `${index + 1}. <b>${d.name}</b>\n   ├ 🆔 วงจร: <code>${d.circuitId || '-'}</code>\n   └ ⏱️ หายไป: <i>${timeStr}</i>\n\n`;
      });
      msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- 🟢 คำสั่ง /status ---
    if (command === '/status' || command.startsWith('/status@')) {
      const searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
      const separator = "━━━━━━━━━━━━━━━━━━";
      
      if (!searchKeyword) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>รูปแบบคำสั่งผิด:</b>\nกรุณาระบุชื่อ หรือ Circuit ID\nเช่น: <code>/status โรงเรียน</code>");
        return;
      }

      let matchedDevices = [];
      if (searchKeyword.startsWith('_id_')) {
        const targetId = searchKeyword.replace('_id_', '');
        const exactDevice = devices.find(d => d.id.toString() === targetId);
        if (exactDevice) matchedDevices.push(exactDevice);
      } else {
        matchedDevices = devices.filter(d => {
          const matchCircuit = d.circuitId && d.circuitId.toLowerCase().includes(searchKeyword);
          const matchName = d.name && d.name.toLowerCase().includes(searchKeyword);
          return matchCircuit || matchName;
        });
      }

      if (matchedDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ <b>ไม่พบข้อมูล:</b>\nอุปกรณ์ที่ตรงกับ "<code>${searchKeyword.replace('_id_', '')}</code>"`);
        return;
      }

      if (matchedDevices.length > 1) {
        let msg = `⚠️ <b>พบข้อมูลมากกว่า 1 รายการ</b>\nกรุณาเลือกอุปกรณ์ที่ต้องการตรวจสอบ:\n`;
        const inlineKeyboard = matchedDevices.slice(0, 10).map(d => {
          return [{ text: `📱 ${d.name} (${d.circuitId || '-'})`, callback_data: `/status _id_${d.id}` }];
        });
        await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: inlineKeyboard });
        return;
      }

      const device = matchedDevices[0];
      const isOffline = getOfflineMinutes(device.lastSeen) > 3;
      const statusIcon = isOffline ? '🔴 Offline' : '🟢 Online';

      let msg = `📱 <b><u>ข้อมูลสถานะอุปกรณ์</u></b>\n`;
      msg += `🖥 ชื่อ: <b>${device.name}</b>\n`;
      msg += `✨ วงจร: <code>${device.circuitId || '-'}</code>\n${separator}\n\n`;
      
      msg += `📍 <b><u>การเชื่อมต่อ</u></b>\n`;
      msg += `🌐 IP: <code>${device.currentIp}</code>\n`;
      if (device.ddnsName && device.ddnsName !== "N/A") {
        msg += `☁️ DDNS: <code>${device.ddnsName}</code>\n`;
      }
      msg += `📊 สถานะ: <b>${statusIcon}</b>\n\n`;

      if (isOffline) {
        const timeStr = device.lastSeen ? formatTimeAgo(getOfflineMinutes(device.lastSeen)) : "ไม่เคยเชื่อมต่อ";
        msg += `⚠️ <i>ขาดการติดต่อไปแล้ว: ${timeStr}</i>`;
      } else {
        const latencyDisplay = device.latency === "N/A" ? "N/A" : (device.latency && device.latency !== "timeout" ? parseLatencyToMs(device.latency) + 'ms' : 'Timeout');
        msg += `⚡ <b><u>ประสิทธิภาพระบบ</u></b>\n`;
        msg += `🎛️ CPU: <code>${device.cpuLoad || 0}%</code> | 🧩 RAM: <code>${device.memoryUsage || 0}%</code>\n`;
        msg += `🌡️ Temp: <code>${device.temp || 'N/A'}</code> | 🌐 Ping: <code>${latencyDisplay}</code>\n`;
        msg += `⏱️ Uptime: <code>${device.uptime || '-'}</code>`;
      }
      msg += `\n\n${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;

      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- 🟢 คำสั่ง /problem ---
    if (command === '/problem' || command.startsWith('/problem@')) {
      const problemDevices = [];
      const separator = "━━━━━━━━━━━━━━━━━━";

      devices.forEach(d => {
        if (d.isAcknowledged) return;
        const diffMinutes = getOfflineMinutes(d.lastSeen);
        if (diffMinutes > 3) {
          d.issue = "🔴 Offline";
          problemDevices.push(d);
          return;
        }
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

        if (issues.length > 0) {
          d.issue = `🟠 ${issues.join(', ')}`;
          problemDevices.push(d);
        }
      });

      if (problemDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b>ยอดเยี่ยม!</b>\nไม่มีอุปกรณ์ที่มีปัญหาค้างในระบบครับ");
        return;
      }

      let msg = `⚠️ <b><u>อุปกรณ์ที่พบปัญหา</u></b>\n`;
      msg += `พบทั้งหมด: <b>${problemDevices.length}</b> เคส\n${separator}\n\n`;

      problemDevices.forEach((d, index) => {
        msg += `${index + 1}. <b>${d.name}</b>\n   └ 🆔 <code>${d.circuitId || '-'}</code>\n   └ ⚠️ ปัญหา: <i>${d.issue}</i>\n\n`;
      });

      msg += `${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อรับทราบปัญหา</a>`;
      await sendTelegramAlert(group.telegramBotToken, chatId, msg);
      return;
    }

    // --- คำสั่ง /top ---
    if (command === '/top' || command.startsWith('/top@')) {
      const onlineDevices = devices.filter(d => getOfflineMinutes(d.lastSeen) <= 3);
      const separator = "━━━━━━━━━━━━━━━━━━";

      if (onlineDevices.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>ไม่มีข้อมูล:</b>\nไม่พบอุปกรณ์ที่ Online ในขณะนี้ครับ");
        return;
      }

      onlineDevices.sort((a, b) => (parseFloat(b.cpuLoad) || 0) - (parseFloat(a.cpuLoad) || 0));
      const top5 = onlineDevices.slice(0, 5);

      let msg = `🔥 <b><u>Top 5 การใช้งานทรัพยากร</u></b>\n${separator}\n\n`;
      top5.forEach((d, index) => {
        const cpu = parseFloat(d.cpuLoad) || 0;
        const cpuIcon = (cpu > thresholds.cpu) ? '🔴' : (cpu > 60) ? '🟠' : '🟢';
        msg += `${index + 1}. <b>${d.name}</b>\n`;
        msg += `   └ ${cpuIcon} CPU: <code>${cpu}%</code> | RAM: <code>${d.memoryUsage || 0}%</code>\n\n`;
      });
      msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">ดูทั้งหมด</a>`;

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
          const separator = "━━━━━━━━━━━━━━━━━━";
          for (const group of device.groups) {
            const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b><u>ผู้รับผิดชอบดูแล</u></b>\n👤 ชื่อ: ${group.adminName || '-'}\n📞 ติดต่อ: ${group.adminContact || '-'}` : '';
            
            let msg = `🚨 <b>[DEVICE OFFLINE]</b>\n${separator}\n`;
            msg += `🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n`;
            msg += `✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>`;
            
            if (device.ddnsName && device.ddnsName !== "N/A") {
                msg += `\n☁️ <b>DDNS:</b> <code>${device.ddnsName}</code>`;
            }
            
            msg += `\n⏳ <b>ขาดการติดต่อ:</b> <code>${new Date(device.lastSeen).toLocaleDateString('th-TH')} ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}</code>`;
            msg += `${adminInfo}`;
            msg += `\n\n${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อตรวจสอบ</a>`;

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