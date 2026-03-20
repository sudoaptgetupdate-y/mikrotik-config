const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); 
const aiService = require('../services/aiService');
const deviceService = require('../services/deviceService');

// ==========================================
// 🛠 Helper Functions
// ==========================================

const sanitizeHTML = (text) => {
  if (!text) return "";
  let cleaned = text.replace(/&/g, '&amp;');
  const allowedTags = [
    { open: /&lt;b&gt;/gi, close: /&lt;\/b&gt;/gi, repOpen: '<b>', repClose: '</b>' },
    { open: /&lt;i&gt;/gi, close: /&lt;\/i&gt;/gi, repOpen: '<i>', repClose: '</i>' },
    { open: /&lt;code&gt;/gi, close: /&lt;\/code&gt;/gi, repOpen: '<code>', repClose: '</code>' }
  ];
  cleaned = cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  allowedTags.forEach(tag => {
    cleaned = cleaned.replace(tag.open, tag.repOpen).replace(tag.close, tag.repClose);
  });
  return cleaned;
};

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
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ALERT_THRESHOLDS' } });
    if (setting && setting.value) {
      let parsed = setting.value;
      while (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (e) { break; } }
      const safeParsed = {};
      if (parsed && typeof parsed === 'object') {
        for (const k in parsed) { safeParsed[k.toLowerCase()] = parsed[k]; }
      }
      thresholds = {
        cpu: Number(safeParsed.cpu ?? thresholds.cpu),
        ram: Number(safeParsed.ram ?? safeParsed.memory ?? thresholds.ram),
        latency: Number(safeParsed.latency ?? safeParsed.ping ?? thresholds.latency),
        temp: Number(safeParsed.temp ?? safeParsed.temperature ?? thresholds.temp),
        storage: Number(safeParsed.storage ?? safeParsed.hdd ?? thresholds.storage),
      };
    }
  } catch (error) { console.error("⚠️ ไม่สามารถดึงค่า Thresholds ได้", error); }
  return thresholds;
};

const getOfflineMinutes = (lastSeen) => {
  if (!lastSeen) return 9999;
  return (new Date() - new Date(lastSeen)) / 1000 / 60;
};

const parseUptimeToSeconds = (uptimeStr) => {
  if (!uptimeStr || uptimeStr === "N/A" || uptimeStr === "-") return 0;
  let totalSeconds = 0;
  const regex = /(?:(\d+)w)?(?:(\d+)d)?(?:(\d+):(\d+):(\d+))?/;
  const match = uptimeStr.match(regex);
  if (match) {
    const weeks = parseInt(match[1] || 0, 10);
    const days = parseInt(match[2] || 0, 10);
    const hours = parseInt(match[3] || 0, 10);
    const minutes = parseInt(match[4] || 0, 10);
    const seconds = parseInt(match[5] || 0, 10);
    totalSeconds = (weeks * 604800) + (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
  }
  return totalSeconds;
};

const expandSearchTerms = (keyword) => {
  const mapping = { 
    'อบต': 'องค์การบริหารส่วนตำบล', 
    'อบจ': 'องค์การบริหารส่วนจังหวัด', 
    'รพสต': 'โรงพยาบาลส่งเสริมสุขภาพตำบล', 
    'รพ': 'โรงพยาบาล', 
    'สภ': 'สถานีตำรวจภูธร', 
    'รร': 'โรงเรียน', 
    'ร.ร': 'โรงเรียน', 
    'กฟภ': 'การไฟฟ้าส่วนภูมิภาค', 
    'ปณ': 'ไปรษณีย์' 
  };
  const results = new Set([keyword]);
  const lowKey = keyword.toLowerCase();

  for (const [abbr, full] of Object.entries(mapping)) {
    // 🎯 ปรับให้เช็คแบบเฉพาะเจาะจงมากขึ้น (ต้องตรงกับตัวย่อเป๊ะๆ หรือเป็นส่วนหนึ่งของชื่อ)
    // เพิ่มเงื่อนไข: ตัวย่อต้องไม่อยู่กลางคำอื่น (เช่น 'รร' ใน 'บรรทัด' จะไม่นับ)
    const abbrRegex = new RegExp(`(^|[.\\s])${abbr}([.\\s]|$)`, 'i');
    
    if (lowKey.includes(abbr.toLowerCase()) || abbrRegex.test(lowKey)) {
      results.add(lowKey.replace(abbr.toLowerCase(), full));
    }
    if (lowKey === full || lowKey.includes(full)) {
      results.add(lowKey.replace(full, abbr));
    }
  }
  return Array.from(results);
};

const formatTimeAgo = (minutes) => {
  if (minutes > 1440) return `${Math.floor(minutes / 1440)} วัน`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} ชม. ${Math.floor(minutes % 60)} นาที`;
  return `${Math.floor(minutes)} นาที`;
};

const generateGroupReportText = (group, isDaily = false, thresholds) => {
  const devices = group.devices || [];
  let onlineHealthy = [], warningUnack = [], warningAck = [], offlineUnack = [], offlineAck = [];
  devices.forEach(d => {
    const diffMinutes = d.lastSeen ? (new Date() - new Date(d.lastSeen)) / 1000 / 60 : 999;
    if (diffMinutes > 3) {
      if (d.isAcknowledged) offlineAck.push(d); else offlineUnack.push(d);
      return;
    }
    const cpu = parseFloat(d.cpuLoad) || 0, ram = parseFloat(d.memoryUsage) || 0, storage = parseFloat(d.storage) || 0, temp = parseFloat(d.temp) || 0, latencyMs = parseLatencyToMs(d.latency);
    let issues = [];
    if (cpu > thresholds.cpu) issues.push(`CPU ${cpu}%`);
    if (ram > thresholds.ram) issues.push(`RAM ${ram}%`);
    if (storage > thresholds.storage) issues.push(`Storage ${storage}%`);
    if (temp > thresholds.temp) issues.push(`Temp ${temp}°C`);
    if (latencyMs > thresholds.latency) issues.push(`Ping ${latencyMs}ms`);
    if (issues.length > 0) {
      const pData = { name: d.name, circuit: d.circuitId, issues: issues.join(', ') };
      if (d.isAcknowledged) warningAck.push(pData); else warningUnack.push(pData);
    } else onlineHealthy.push(d);
  });
  const totalWarning = warningUnack.length + warningAck.length, totalOnline = onlineHealthy.length + totalWarning, totalOffline = offlineUnack.length + offlineAck.length;
  const title = isDaily ? "🗓 <b><u>รายงานสถานะระบบประจำวัน</u></b>" : "📊 <b><u>รายงานสถานะระบบภาพรวม</u></b>";
  const separator = "━━━━━━━━━━━━━━━━━━";
  let msg = `${title}\n<code>กลุ่ม: ${group.name}</code>\n${separator}\n\n📍 <b><u>สรุปสถานะอุปกรณ์</u></b>\n📦 ทั้งหมด: <b>${devices.length}</b> รายการ\n✅ Online: <b>${totalOnline}</b> รายการ\n      ├ ปกติ: <code>${onlineHealthy.length}</code>\n      └ ปัญหา: <code>${totalWarning}</code> ${warningAck.length > 0 ? `<i>(Ack: ${warningAck.length})</i>` : ''}\n🛑 Offline: <b>${totalOffline}</b> รายการ\n`;
  if (totalOffline > 0) { msg += `      ├ 🚨 ใหม่: <code>${offlineUnack.length}</code>\n      └ ⌛ รับทราบ: <code>${offlineAck.length}</code>\n`; }
  msg += `\n${separator}\n🚨 <b><u>ปัญหาที่ต้องตรวจสอบด่วน</u></b>\n`;
  if (warningUnack.length === 0 && offlineUnack.length === 0) msg += `✅ <i>ระบบทำงานปกติ ไม่พบปัญหาใหม่</i>\n`;
  else {
    offlineUnack.forEach(o => msg += `• <b>${o.name}</b>\n  └ 🛑 <b><code>[ OFFLINE ]</code></b> ขาดการติดต่อ\n`);
    warningUnack.forEach(p => msg += `• <b>${p.name}</b>\n  └ ⚠️ <code>${p.issues}</code>\n`);
  }
  if (warningAck.length > 0 || offlineAck.length > 0) {
    msg += `\n⌛ <b><u>อยู่ระหว่างดำเนินการ (Ack)</u></b>\n`;
    offlineAck.forEach(o => msg += `• <b>${o.name}</b>\n  └ 🛑 <b><code>[ OFFLINE ]</code></b> รับทราบแล้ว\n`);
    warningAck.forEach(a => msg += `• <b>${a.name}</b>\n  └ 🔸 <code>${a.issues}</code>\n`);
  }
  msg += `\n${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
  return msg;
};

// ==========================================
// 🎯 API: จัดการ Webhook (รับคำสั่งจาก Telegram)
// ==========================================

const dispatchCommand = async (group, chatId, devices, thresholds, cmd, args) => {
  const command = cmd.toLowerCase();
  const separator = "━━━━━━━━━━━━━━━━━━";

  // --- 🟢 คำสั่ง /help ---
  if (['/help', '/hi', '/start', '/menu'].includes(command) || command.startsWith('/help@')) {
    let msg = `👋 <b><u>สวัสดีครับ! ระบบจัดการ Network พร้อมให้บริการ</u></b>\nกรุณาจิ้มเลือกดูข้อมูลจากเมนูด้านล่างได้เลยครับ 👇\n\n` +
              `💡 <b>คำแนะนำ:</b>\n` +
              `• หากต้องการเช็ครายเครื่องหรือรับทราบปัญหา คุณสามารถ<b>พิมพ์ชื่ออุปกรณ์</b>เข้ามาได้เลยทันทีครับ\n` +
              `• หรือเลือกกดปุ่มด้านล่างเพื่อดูข้อมูลสรุปในด้านต่างๆ`;
    
    const keyboard = [
      [{ text: "🛑 ดูเครื่อง Offline", callback_data: "/offline" }, { text: "⚠️ ดูเครื่องมีปัญหา", callback_data: "/problem" }], 
      [{ text: "📜 เหตุการณ์ล่าสุด", callback_data: "/event" }, { text: "📊 รายงานภาพรวม", callback_data: "/report" }],
      [{ text: "🧩 Top 5 RAM", callback_data: "/top ram 5" }, { text: "🌡️ Top 5 Temp", callback_data: "/top temp 5" }],
      [{ text: "📶 Top 5 Ping", callback_data: "/top ping 5" }, { text: "💾 Top 5 Disk", callback_data: "/top hdd 5" }],
      [{ text: "🔍 เช็ครายเครื่อง (พิมพ์ชื่อ)", callback_data: "/status_hint" }, { text: "✅ รับทราบปัญหา (พิมพ์ชื่อ)", callback_data: "/ack_hint" }]
    ];
    await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: keyboard });
    return true;
  }

  // --- 💡 คำสั่งแนะนำ (Hints) ---
  if (command === '/status_hint') {
    await sendTelegramAlert(group.telegramBotToken, chatId, "🔍 <b><u>การเช็คสถานะรายเครื่อง</u></b>\nกรุณาพิมพ์ <code>/status [ชื่อเครื่อง]</code>\n\n<i>ตัวอย่าง: <code>/status บ้านโคก</code></i>");
    return true;
  }
  if (command === '/ack_hint') {
    await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b><u>การรับทราบปัญหา</u></b>\nกรุณาพิมพ์ <code>/ack [ชื่อเครื่อง]</code>\n\n<i>ตัวอย่าง: <code>/ack บ้านโคก</code></i>");
    return true;
  }

  // --- 🟢 คำสั่ง /ack (Acknowledge) ---
  if (command === '/ack' || command.startsWith('/ack@')) {
    const searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
    if (!searchKeyword) { 
      await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b><u>รูปแบบคำสั่งผิด</u></b>\nกรุณาระบุชื่อ หรือ Circuit ID เช่น <code>/ack บ้านโคก</code>"); 
      return true; 
    }

    let matchedDevice;
    if (searchKeyword.startsWith('_id_')) {
      const id = searchKeyword.replace('_id_', '');
      matchedDevice = devices.find(x => x.id.toString() === id);
    } else {
      const matched = devices.filter(d => (d.name && d.name.toLowerCase().includes(searchKeyword)) || (d.circuitId && d.circuitId.toLowerCase().includes(searchKeyword)));
      if (matched.length === 0) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ <b><u>ไม่พบอุปกรณ์</u></b>\nไม่พบเครื่องที่ตรงกับ "${searchKeyword}" ครับ`);
        return true;
      }
      if (matched.length > 1) {
        const keyboard = matched.slice(0, 10).map(d => [{ text: `✅ รับทราบ: ${d.name}`, callback_data: `/ack _id_${d.id}` }]);
        await sendTelegramAlert(group.telegramBotToken, chatId, `⚠️ <b><u>พบข้อมูลมากกว่า 1 รายการ</u></b>\nกรุณาเลือกเครื่องที่ต้องการรับทราบปัญหา:`, { inline_keyboard: keyboard });
        return true;
      }
      matchedDevice = matched[0];
    }

    if (matchedDevice) {
      // 🎯 [NEW] ตรวจสอบว่าอุปกรณ์มีปัญหาอยู่จริงหรือไม่
      const isDeviceOffline = getOfflineMinutes(matchedDevice.lastSeen) > 3;
      const hasProblem = matchedDevice.isOfflineAlerted || matchedDevice.isWarningAlerted || isDeviceOffline;

      if (!hasProblem) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `✅ <b><u>สถานะปกติ</u></b>\n🖥 <b>ชื่อ:</b> <b>${matchedDevice.name}</b>\n\nอุปกรณ์นี้ทำงานเป็นปกติอยู่แล้ว ไม่จำเป็นต้องรับทราบปัญหาครับ`);
        return true;
      }

      await prisma.managedDevice.update({ where: { id: matchedDevice.id }, data: { isAcknowledged: true } });
      
      // 🎯 [FIX] เปลี่ยนจาก ActivityLog (ซึ่งต้องมี User) เป็น DeviceEventLog แทน
      await prisma.deviceEventLog.create({ 
        data: { 
          deviceId: matchedDevice.id, 
          eventType: 'ACKNOWLEDGE', 
          details: `รับทราบปัญหาผ่าน Telegram` 
        } 
      });

      await sendTelegramAlert(group.telegramBotToken, chatId, `✅ <b><u>รับทราบปัญหาแล้ว</u></b>\n🖥 <b>ชื่อ:</b> <b>${matchedDevice.name}</b>\n✨ <b>วงจร:</b> <code>${matchedDevice.circuitId || '-'}</code>\n\n👌 ระบบบันทึกการรับทราบปัญหาเรียบร้อยแล้วครับ`);
    }
    return true;
  }

  // --- 🟢 คำสั่ง /event (Timeline) ---
  if (command === '/event' || command.startsWith('/event@')) {
    const deviceIds = devices.map(d => d.id);
    const logs = await prisma.deviceEventLog.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { device: true }
    });

    if (logs.length === 0) {
      await sendTelegramAlert(group.telegramBotToken, chatId, "ℹ️ <b><u>เหตุการณ์ล่าสุด</u></b>\nยังไม่มีบันทึกเหตุการณ์สำคัญในกลุ่มนี้ครับ");
      return true;
    }

    let msg = `📜 <b><u>เหตุการณ์สำคัญล่าสุด</u></b>\nแสดง 10 รายการล่าสุดในกลุ่ม\n${separator}\n\n`;
    logs.forEach((l, i) => {
      const time = new Date(l.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const emoji = l.eventType === 'OFFLINE' ? '🛑' : (l.eventType === 'ONLINE' ? '✅' : '⚠️');
      msg += `${i + 1}. <code>${time}</code> | ${emoji} <b>${l.device.name}</b>\n   └ <i>${l.details}</i>\n\n`;
    });
    msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">ดู Log ทั้งหมด</a>`;
    const keyboard = [[{ text: "🔄 ดึงข้อมูลล่าสุด", callback_data: "/event" }]];
    await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: keyboard });
    return true;
  }

  // --- คำสั่ง /report ---
  if (command === '/report' || command.startsWith('/report@')) {
    const msg = generateGroupReportText(group, false, thresholds);
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- คำสั่ง /offline ---
  if (command === '/offline' || command.startsWith('/offline@')) {
    const offlineDevices = devices.filter(d => getOfflineMinutes(d.lastSeen) > 3);
    if (offlineDevices.length === 0) { await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b><u>สถานะปกติ</u></b>\nไม่มีอุปกรณ์ใด Offline ในขณะนี้ครับ"); return true; }
    offlineDevices.sort((a, b) => getOfflineMinutes(b.lastSeen) - getOfflineMinutes(a.lastSeen));
    let msg = `🛑 <b><u>สรุปอุปกรณ์ที่ Offline</u></b>\nพบทั้งหมด: <b>${offlineDevices.length}</b> รายการ\n${separator}\n\n`;
    offlineDevices.forEach((d, index) => {
      const mins = getOfflineMinutes(d.lastSeen);
      msg += `${index + 1}. <b>${d.name}</b>\n   ├ ✨ วงจร: <code>${d.circuitId || '-'}</code>\n   └ ⏱️ หายไป: <i>${d.lastSeen ? formatTimeAgo(mins) : "ไม่เคยเชื่อมต่อ"}</i>\n\n`;
    });
    msg += `${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- 🟢 คำสั่ง /status ---
  if (command === '/status' || command.startsWith('/status@')) {
    let searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
    let page = 1;
    if (searchKeyword.startsWith('_page_')) {
      const parts = searchKeyword.split('_');
      page = parseInt(parts[2], 10) || 1;
      searchKeyword = parts.slice(3).join('_');
    }
    if (!searchKeyword) { await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b><u>รูปแบบคำสั่งผิด</u></b>\nกรุณาระบุชื่อ หรือ Circuit ID"); return true; }
    let matched = [];
    if (searchKeyword.startsWith('_id_')) {
      const id = searchKeyword.replace('_id_', '');
      const d = devices.find(x => x.id.toString() === id);
      if (d) matched.push(d);
    } else {
      const searchTerms = expandSearchTerms(searchKeyword);
      matched = devices.filter(d => {
        const name = (d.name || '').toLowerCase();
        const circuit = (d.circuitId || '').toLowerCase();
        return searchTerms.some(term => name.includes(term.toLowerCase()) || circuit.includes(term.toLowerCase()));
      });
    }
    if (matched.length === 0) return false;
    if (matched.length > 1) {
      const limit = 10;
      const start = (page - 1) * limit;
      const end = start + limit;
      const currentItems = matched.slice(start, end);
      if (currentItems.length === 0 && page > 1) { await sendTelegramAlert(group.telegramBotToken, chatId, "❌ ไม่พบข้อมูลในหน้านี้แล้วครับ"); return true; }
      if (page === 1 && matched.length === 1) { /* Skip pagination */ } else {
        const keyboard = currentItems.map(d => [{ text: `📱 ${d.name} (${d.circuitId || '-'})`, callback_data: `/status _id_${d.id}` }]);
        if (matched.length > end) { keyboard.push([{ text: `🔍 ดูเพิ่มเติม (รายการที่ ${end + 1}-${Math.min(end + 10, matched.length)})`, callback_data: `/status _page_${page + 1}_${searchKeyword}` }]); }
        const msgText = `⚠️ <b><u>พบข้อมูลทั้งหมด ${matched.length} รายการ</u></b>\nแสดงรายการที่ ${start + 1} - ${Math.min(end, matched.length)}\nกรุณาเลือกอุปกรณ์ที่ต้องการตรวจสอบ:`;
        await sendTelegramAlert(group.telegramBotToken, chatId, msgText, { inline_keyboard: keyboard });
        return true;
      }
    }
    const device = matched[0];
    const isOffline = getOfflineMinutes(device.lastSeen) > 3;
    let msg = `📱 <b><u>ข้อมูลสถานะอุปกรณ์</u></b>\n🖥 ชื่อ: <b>${device.name}</b>\n✨ วงจร: <code>${device.circuitId || '-'}</code>\n🏷️ รุ่น: <code>${device.boardName || '-'}</code>\n${separator}\n\n📍 <b><u>การเชื่อมต่อ</u></b>\n🌐 IP: <code>${device.currentIp}</code>\n`;
    if (device.ddnsName && device.ddnsName !== "N/A") msg += `☁️ <b>DDNS:</b> <code>${device.ddnsName}</code>\n`;
    msg += `📊 สถานะ: ${isOffline ? '🛑 <b><code>[ OFFLINE ]</code></b>' : '✅ <b><code>[ ONLINE ]</code></b>'}\n\n`;
    if (isOffline) msg += `⚠️ <i>ขาดการติดต่อไปแล้ว: ${device.lastSeen ? formatTimeAgo(getOfflineMinutes(device.lastSeen)) : "ไม่เคยเชื่อมต่อ"}</i>`;
    else {
      const latency = device.latency === "N/A" ? "N/A" : (device.latency && device.latency !== "timeout" ? parseLatencyToMs(device.latency) + 'ms' : 'Timeout');
      msg += `⚡ <b><u>ประสิทธิภาพระบบ</u></b>\n🎛️ CPU: <code>${device.cpuLoad || 0}%</code> | 🧩 RAM: <code>${device.memoryUsage || 0}%</code>\n🌡️ Temp: <code>${device.temp || 'N/A'}°C</code> | 📶 Ping: <code>${latency}</code>\n⏱️ Uptime: <code>${device.uptime || '-'}</code>`;
    }
    msg += `\n\n${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
    const keyboard = [[{ text: "🔄 อัปเดตข้อมูล", callback_data: `/status _id_${device.id}` }, { text: "✅ รับทราบปัญหา", callback_data: `/ack _id_${device.id}` }]];
    await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: keyboard });
    return true;
  }

  // --- 🟢 คำสั่ง /problem ---
  if (command === '/problem' || command.startsWith('/problem@')) {
    const problems = [];
    devices.forEach(d => {
      if (d.isAcknowledged) return;
      if (getOfflineMinutes(d.lastSeen) > 3) { d.issue = "🛑 Offline"; problems.push(d); return; }
      const cpu = parseFloat(d.cpuLoad) || 0, ram = parseFloat(d.memoryUsage) || 0, latency = parseLatencyToMs(d.latency);
      let issues = [];
      if (cpu > thresholds.cpu) issues.push(`CPU ${cpu}%`);
      if (ram > thresholds.ram) issues.push(`RAM ${ram}%`);
      if (latency > thresholds.latency) issues.push(`Ping ${latency}ms`);
      if (issues.length > 0) { d.issue = `⚠️ ${issues.join(', ')}`; problems.push(d); }
    });
    if (problems.length === 0) { await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b><u>สถานะปกติ</u></b>\nไม่พบอุปกรณ์ที่มีปัญหาใหม่ในระบบครับ"); return true; }
    let msg = `⚠️ <b><u>รายการอุปกรณ์ที่พบปัญหา</u></b>\nพบทั้งหมด: <b>${problems.length}</b> เคส\n${separator}\n\n`;
    problems.forEach((d, i) => msg += `${i + 1}. <b>${d.name}</b>\n   ├ ✨ วงจร: <code>${d.circuitId || '-'}</code>\n   └ 🚨 ปัญหา: <i>${d.issue}</i>\n\n`);
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- คำสั่ง /top ---
  if (command === '/top' || command.startsWith('/top@')) {
    const online = devices.filter(d => getOfflineMinutes(d.lastSeen) <= 3);
    if (online.length === 0) { await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b><u>ไม่มีข้อมูล</u></b>\nไม่พบอุปกรณ์ที่ Online ในขณะนี้ครับ"); return true; }
    let metric = (args[1] || 'cpu').toLowerCase();
    let count = parseInt(args[2] || (isNaN(parseInt(args[1])) ? 5 : args[1]), 10);
    if (isNaN(count)) count = 5;
    if (!isNaN(parseInt(args[1]))) { metric = 'cpu'; count = parseInt(args[1]); }
    let title = "", emoji = "🔥";
    switch (metric) {
      case 'ram': case 'memory': online.sort((a, b) => (parseFloat(b.memoryUsage) || 0) - (parseFloat(a.memoryUsage) || 0)); title = `Top ${count} การใช้งาน RAM สูงสุด`; emoji = "🧩"; break;
      case 'temp': case 'temperature': online.sort((a, b) => (parseFloat(b.temp) || 0) - (parseFloat(a.temp) || 0)); title = `Top ${count} อุณหภูมิสูงสุด`; emoji = "🌡️"; break;
      case 'ping': case 'latency': online.sort((a, b) => parseLatencyToMs(b.latency) - parseLatencyToMs(a.latency)); title = `Top ${count} Latency สูงสุด`; emoji = "📶"; break;
      case 'hdd': case 'disk': case 'storage': online.sort((a, b) => (parseFloat(b.storage) || 0) - (parseFloat(a.storage) || 0)); title = `Top ${count} การใช้งาน Disk สูงสุด`; emoji = "💾"; break;
      case 'uptime': online.sort((a, b) => parseUptimeToSeconds(b.uptime) - parseUptimeToSeconds(a.uptime)); title = `Top ${count} อุปกรณ์ที่ Uptime นานที่สุด`; emoji = "⏱️"; break;
      default: online.sort((a, b) => (parseFloat(b.cpuLoad) || 0) - (parseFloat(a.cpuLoad) || 0)); title = `Top ${count} การใช้งาน CPU สูงสุด`; emoji = "🎛️";
    }
    const topList = online.slice(0, count);
    let msg = `${emoji} <b><u>${title}</u></b>\n${separator}\n\n`;
    topList.forEach((d, i) => {
      let vStr = "";
      if (metric === 'cpu') vStr = `🎛️ CPU: <code>${d.cpuLoad || 0}%</code> | 🧩 RAM: <code>${d.memoryUsage || 0}%</code>`;
      else if (metric === 'ram') vStr = `🧩 RAM: <code>${d.memoryUsage || 0}%</code> | 🎛️ CPU: <code>${d.cpuLoad || 0}%</code>`;
      else if (metric === 'temp') vStr = `🌡️ Temp: <code>${d.temp || 'N/A'}°C</code>`;
      else if (metric === 'ping') vStr = `📶 Ping: <code>${parseLatencyToMs(d.latency)}ms</code>`;
      else if (metric === 'hdd') vStr = `💾 Storage: <code>${d.storage || 0}%</code>`;
      else if (metric === 'uptime') vStr = `⏱️ Uptime: <code>${d.uptime || '-'}</code>`;
      msg += `${i + 1}. <b>${d.name}</b>\n   └ ${vStr}\n\n`;
    });
    msg += `${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }
  return false;
};

exports.handleWebhook = async (req, res) => {
  res.sendStatus(200);
  let chatId, text;
  if (req.body.message && req.body.message.text) {
    chatId = req.body.message.chat.id.toString(); text = req.body.message.text.trim();
  } else if (req.body.callback_query) {
    chatId = req.body.callback_query.message.chat.id.toString(); text = req.body.callback_query.data.trim();
  } else return;

  try {
    const group = await prisma.deviceGroup.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } 
    });
    if (!group || !group.telegramBotToken) return;
    const devices = group.devices || [];
    const thresholds = await getAlertThresholds();
    const low = text.toLowerCase();
    let handled = false;

    if (text.startsWith('/')) {
      handled = await dispatchCommand(group, chatId, devices, thresholds, text.split(' ')[0], text.split(' '));
    } else {
      if (['อันดับ', 'top', 'สูงสุด'].some(k => low.includes(k))) {
        let metric = 'cpu';
        if (['ram', 'memory', 'แรม', 'หน่วยความจำ', 'mem'].some(k => low.includes(k))) metric = 'ram';
        else if (['temp', 'temperature', 'ร้อน', 'อุณหภูมิ', 'องศา', 'heat'].some(k => low.includes(k))) metric = 'temp';
        else if (['hdd', 'disk', 'storage', 'พื้นที่', 'ความจุ', 'ดิสก์', 'ssd', 'harddisk'].some(k => low.includes(k))) metric = 'hdd';
        else if (['ping', 'latency', 'ช้า', 'แลค', 'ms'].some(k => low.includes(k))) metric = 'ping';
        else if (['uptime', 'ออนไลน์นาน', 'อัพไทม์'].some(k => low.includes(k))) metric = 'uptime';
        const matchCount = text.match(/\d+/);
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/top', ['/top', metric, matchCount ? matchCount[0] : '5']);
      }
      else if (['offline', 'ออฟไลน์', 'เครื่องดับ', 'ติดต่อไม่ได้'].some(k => low.includes(k))) {
        if (!['เคย', 'ย้อนหลัง', 'ชั่วโมง', 'วัน', 'ประวัติ'].some(k => low.includes(k))) {
          handled = await dispatchCommand(group, chatId, devices, thresholds, '/offline', []);
        }
      }
      else if (['ปัญหา', 'problem', 'เสีย', 'พัง'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/problem', []);
      }
      else if (['รายงาน', 'report', 'ดูรายงาน'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/report', []);
      }
      else if (['ช่วยเหลือ', 'ช่วยด้วย', 'help', 'ทำอะไรได้บ้าง', 'เมนู'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/help', []);
      }
      
      if (!handled) {
        const statusKeywords = ['ขอข้อมูล', 'ข้อมูล', 'สถานะ', 'เช็ค', 'check', 'ดู', 'ขอดู', 'แสดง', 'ทั้งหมด'];
        const isStatusIntent = statusKeywords.some(k => low.includes(k));
        let searchTerm = low;
        statusKeywords.forEach(k => searchTerm = searchTerm.replace(new RegExp(k, 'g'), ''));
        searchTerm = searchTerm.trim();
        if (searchTerm || isStatusIntent) {
          const searchTerms = expandSearchTerms(searchTerm);
          const matched = devices.filter(d => {
            const name = (d.name || '').toLowerCase();
            const circuit = (d.circuitId || '').toLowerCase();
            return searchTerms.some(term => name.includes(term.toLowerCase()) || circuit.includes(term.toLowerCase()));
          });
          if (matched.length > 0 && (isStatusIntent || searchTerm.length >= 2)) {
            handled = await dispatchCommand(group, chatId, devices, thresholds, '/status', ['/status', searchTerm]);
          }
        }
      }
    }

    if (!handled) {
      const aiEnabled = await aiService.isAIEnabled(group.id);
      if (aiEnabled) {
        await sendTelegramAlert(group.telegramBotToken, chatId, "🤖 <i>กำลังประมวลผลคำตอบ...</i>");
        const aiContext = await deviceService.getAISummary(group.id);
        const aiReply = await aiService.askAI(text, aiContext, group.id);
        if (aiReply) {
          if (aiReply.includes('COMMAND:')) {
            const parts = aiReply.split('COMMAND:');
            const replyText = sanitizeHTML(parts[0].trim());
            const fullCmd = parts[1].trim();
            const cmdArgs = fullCmd.split(' ');
            if (replyText) await sendTelegramAlert(group.telegramBotToken, chatId, replyText);
            const cmdHandled = await dispatchCommand(group, chatId, devices, thresholds, cmdArgs[0], cmdArgs);
            if (!cmdHandled && !replyText) await sendTelegramAlert(group.telegramBotToken, chatId, sanitizeHTML(aiReply.replace('COMMAND:', '')));
          } else await sendTelegramAlert(group.telegramBotToken, chatId, sanitizeHTML(aiReply));
        }
      } else if (text.startsWith('/')) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ ไม่พบข้อมูลอุปกรณ์หรือคำสั่งที่ระบุครับ`);
      }
    }
  } catch (error) { console.error("❌ Telegram Webhook Error:", error); }
};

exports.initDailyReportCron = () => {
  cron.schedule('30 7 * * *', async () => {
    try {
      const groups = await prisma.deviceGroup.findMany({
        where: { isNotifyEnabled: true, telegramBotToken: { not: null }, telegramChatId: { not: null } },
        include: { devices: { where: { status: { not: 'DELETED' } } } }
      });
      if (groups.length > 0) {
        const thresholds = await getAlertThresholds();
        for (const group of groups) {
          if (group.devices && group.devices.length > 0) {
            const msg = generateGroupReportText(group, true, thresholds);
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
    } catch (error) { console.error("❌ [CRON] Daily Report Error:", error); }
  }, { scheduled: true, timezone: "Asia/Bangkok" });
};

exports.initRealtimeMonitorCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
      const deadDevices = await prisma.managedDevice.findMany({
        where: { status: { not: 'DELETED' }, lastSeen: { lt: threeMinsAgo }, isOfflineAlerted: false },
        include: { groups: true }
      });
      for (const device of deadDevices) {
        let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};
        await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'OFFLINE', details: 'Device went offline (No heartbeat for > 3 mins)' } });
        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b><u>ผู้รับผิดชอบดูแล</u></b>\n👤 ชื่อ: ${group.adminName || '-'}\n📞 ติดต่อ: ${group.adminContact || '-'}` : '';
              let msg = `🛑 <b><u>[ DEVICE OFFLINE ]</u></b>\n━━━━━━━━━━━━━━━━━━\n🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n🏷️ <b>รุ่น:</b> <code>${device.boardName || '-'}</code>\n📊 <b>สถานะ:</b> 🛑 <b><code>[ OFFLINE ]</code></b>\n⏳ <b>ขาดการติดต่อ:</b> <code>${new Date(device.lastSeen).toLocaleDateString('th-TH')} ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}</code>${adminInfo}\n\n━━━━━━━━━━━━━━━━━━\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อตรวจสอบ</a>`;
              const keyboard = [[{ text: "✅ รับทราบปัญหา", callback_data: `/ack _id_${device.id}` }]];
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, { inline_keyboard: keyboard });
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }
        await prisma.managedDevice.update({ where: { id: device.id }, data: { isOfflineAlerted: true, isAcknowledged: false, lastAlertMessageIds: alertMsgIds } });
      }
    } catch (error) { console.error("❌ Offline Monitor Cron Error:", error); }
  });
};