const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const cron = require('node-cron'); 
const aiService = require('../services/aiService');
const deviceService = require('../services/deviceService');

// ==========================================
// 🛠 Helper Functions
// ==========================================

/**
 * 🧹 ฟังก์ชันสำหรับล้างเครื่องหมาย HTML ที่ Telegram ไม่รองรับ
 * ป้องกัน Error: Bad Request: can't parse entities
 */
const sanitizeHTML = (text) => {
  if (!text) return "";
  // 1. เปลี่ยน & เป็น &amp; ก่อน (ต้องทำเป็นอันดับแรก)
  let cleaned = text.replace(/&/g, '&amp;');
  
  // 2. เก็บ Tag ที่อนุญาตไว้ชั่วคราว (<b>, <i>, <code>)
  const allowedTags = [
    { open: /&lt;b&gt;/gi, close: /&lt;\/b&gt;/gi, repOpen: '<b>', repClose: '</b>' },
    { open: /&lt;i&gt;/gi, close: /&lt;\/i&gt;/gi, repOpen: '<i>', repClose: '</i>' },
    { open: /&lt;code&gt;/gi, close: /&lt;\/code&gt;/gi, repOpen: '<code>', repClose: '</code>' }
  ];

  // 3. เปลี่ยน < และ > ทั้งหมดเป็น Entity เพื่อความปลอดภัย
  cleaned = cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 4. นำ Tag ที่อนุญาตกลับคืนมา
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
    const setting = await prisma.systemSetting.findUnique({ 
      where: { key: 'ALERT_THRESHOLDS' }
    });
    
    if (setting && setting.value) {
      let parsed = setting.value;
      while (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { break; }
      }
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
  } catch (error) {
    console.error("⚠️ ไม่สามารถดึงค่า Thresholds ได้", error);
  }
  return thresholds;
};

const getOfflineMinutes = (lastSeen) => {
  if (!lastSeen) return 9999;
  return (new Date() - new Date(lastSeen)) / 1000 / 60;
};

/**
 * ⏱️ แปลง Mikrotik Uptime (1w2d03:04:05) ให้เป็นวินาทีเพื่อใช้เรียงลำดับ
 */
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

/**
 * 🇹🇭 ฟังก์ชันขยายคำค้นหาสำหรับตัวย่อภาษาไทยที่เป็นทางการ
 */
const expandSearchTerms = (keyword) => {
  const mapping = {
    'อบต': ['อบต', 'องค์การบริหารส่วนตำบล'],
    'อบจ': ['อบจ', 'องค์การบริหารส่วนจังหวัด'],
    'เทศบาล': ['ทม', 'ทน', 'ทต', 'เทศบาล'],
    'รพ': ['รพ', 'โรงพยาบาล'],
    'รพสต': ['รพ.สต', 'โรงพยาบาลส่งเสริมสุขภาพตำบล', 'อนามัย'],
    'สภ': ['สภ', 'สถานีตำรวจภูธร'],
    'โรงเรียน': ['ร.ร', 'รร', 'โรงเรียน'],
    'สพป': ['สพป', 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา'],
    'สพม': ['สพม', 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา'],
    'กฟภ': ['กฟภ', 'pea', 'การไฟฟ้าส่วนภูมิภาค'],
    'ไปรษณีย์': ['ปณ', 'ไปรษณีย์']
  };

  const results = new Set([keyword]);
  // ลบจุดและช่องว่างเพื่อการเปรียบเทียบที่แม่นยำ
  const cleanKeyword = keyword.replace(/\./g, '').replace(/\s/g, ''); 

  for (const [key, values] of Object.entries(mapping)) {
    // ตรวจสอบว่า keyword ตรงกับ key (ตัวย่อหลัก) หรือมีอยู่ใน values (คำเต็ม/ตัวย่ออื่นๆ)
    const isMatch = cleanKeyword.includes(key) || 
                    values.some(v => cleanKeyword.includes(v.replace(/\./g, '')));
    
    if (isMatch) {
      values.forEach(v => results.add(v));
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
      if (d.isAcknowledged) offlineAck.push(d);
      else offlineUnack.push(d);
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
      const problemData = { name: d.name, circuit: d.circuitId, issues: issues.join(', ') };
      if (d.isAcknowledged) warningAck.push(problemData);
      else warningUnack.push(problemData);
    } else onlineHealthy.push(d);
  });

  const totalWarning = warningUnack.length + warningAck.length, totalOnline = onlineHealthy.length + totalWarning, totalOffline = offlineUnack.length + offlineAck.length;
  const title = isDaily ? "🗓 <b>รายงานสถานะระบบประจำวัน</b>" : "📊 <b>รายงานสถานะระบบภาพรวม</b>";
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
  msg += `\n${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;
  return msg;
};

// ==========================================
// 🎯 API: จัดการ Webhook (รับคำสั่งจาก Telegram)
// ==========================================

/**
 * ฟังก์ชันหลักในการประมวลผลคำสั่ง
 */
const dispatchCommand = async (group, chatId, devices, thresholds, cmd, args) => {
  const command = cmd.toLowerCase();
  const separator = "━━━━━━━━━━━━━━━━━━";

  // --- 🟢 คำสั่ง /help, /hi, /start, /menu (เมนูหลัก) ---
  if (['/help', '/hi', '/start', '/menu'].includes(command) || command.startsWith('/help@')) {
    let msg = `👋 <b>สวัสดีครับ! ระบบจัดการ Network พร้อมให้บริการ</b>\nกรุณาจิ้มเลือกดูข้อมูลจากเมนูด้านล่างได้เลยครับ 👇\n\n🔍 <b>ต้องการดูสถานะเฉพาะเครื่อง?</b>\nพิมพ์คำสั่ง <code>/status [ชื่อ หรือ Circuit ID]</code>\nหรือพิมพ์ชื่ออุปกรณ์/วงจร เข้ามาได้เลยครับ`;
    const keyboard = [[{ text: "🔴 ดูเครื่องออฟไลน์", callback_data: "/offline" }, { text: "⚠️ ดูเครื่องมีปัญหา", callback_data: "/problem" }], [{ text: "📊 รายงานภาพรวม", callback_data: "/report" }, { text: "🔥 จัดอันดับ Top 5", callback_data: "/top" }]];
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
    if (offlineDevices.length === 0) { await sendTelegramAlert(group.telegramBotToken, chatId, "🟢 <b>สถานะปกติ:</b>\nไม่มีอุปกรณ์ใด Offline ในขณะนี้ครับ"); return true; }
    offlineDevices.sort((a, b) => getOfflineMinutes(b.lastSeen) - getOfflineMinutes(a.lastSeen));
    let msg = `🔴 <b><u>สรุปอุปกรณ์ที่ Offline</u></b>\nพบทั้งหมด: <b>${offlineDevices.length}</b> รายการ\n${separator}\n\n`;
    offlineDevices.forEach((d, index) => {
      const mins = getOfflineMinutes(d.lastSeen);
      msg += `${index + 1}. <b>${d.name}</b>\n   ├ 🆔 วงจร: <code>${d.circuitId || '-'}</code>\n   └ ⏱️ หายไป: <i>${d.lastSeen ? formatTimeAgo(mins) : "ไม่เคยเชื่อมต่อ"}</i>\n\n`;
    });
    msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- 🟢 คำสั่ง /status ---
  if (command === '/status' || command.startsWith('/status@')) {
    const searchKeyword = args.slice(1).join(' ').trim().toLowerCase();
    if (!searchKeyword) { await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>รูปแบบคำสั่งผิด:</b>\nกรุณาระบุชื่อ หรือ Circuit ID"); return true; }
    let matched = [];
    if (searchKeyword.startsWith('_id_')) {
      const id = searchKeyword.replace('_id_', '');
      const d = devices.find(x => x.id.toString() === id);
      if (d) matched.push(d);
    } else {
      // 🎯 [NEW] ใช้ระบบขยายคำค้นหา (ตัวย่อ/คำเต็ม)
      const searchTerms = expandSearchTerms(searchKeyword);
      
      matched = devices.filter(d => {
        const name = (d.name || '').toLowerCase();
        const circuit = (d.circuitId || '').toLowerCase();
        
        // ค้นหาว่าชื่อเครื่อง หรือ Circuit ID ตรงกับคำค้นหาใดๆ ใน List หรือไม่
        return searchTerms.some(term => 
          name.includes(term.toLowerCase()) || 
          circuit.includes(term.toLowerCase())
        );
      });
    }
    if (matched.length === 0) return false;
    if (matched.length > 1) {
      const keyboard = matched.slice(0, 10).map(d => [{ text: `📱 ${d.name} (${d.circuitId || '-'})`, callback_data: `/status _id_${d.id}` }]);
      await sendTelegramAlert(group.telegramBotToken, chatId, `⚠️ <b>พบข้อมูลมากกว่า 1 รายการ</b>\nกรุณาเลือกอุปกรณ์ที่ต้องการตรวจสอบ:`, { inline_keyboard: keyboard });
      return true;
    }
    const device = matched[0];
    const isOffline = getOfflineMinutes(device.lastSeen) > 3;
    let msg = `📱 <b><u>ข้อมูลสถานะอุปกรณ์</u></b>\n🖥 ชื่อ: <b>${device.name}</b>\n✨ วงจร: <code>${device.circuitId || '-'}</code>\n🏷️ รุ่น: <code>${device.boardName || '-'}</code>\n${separator}\n\n📍 <b><u>การเชื่อมต่อ</u></b>\n🌐 IP: <code>${device.currentIp}</code>\n`;
    if (device.ddnsName && device.ddnsName !== "N/A") msg += `\n☁️ <b>DDNS:</b> <code>${device.ddnsName}</code>\n`;
    msg += `📊 สถานะ: ${isOffline ? '🛑 <b><code>[ OFFLINE ]</code></b>' : '✅ <b><code>[ ONLINE ]</code></b>'}\n\n`;
    if (isOffline) msg += `⚠️ <i>ขาดการติดต่อไปแล้ว: ${device.lastSeen ? formatTimeAgo(getOfflineMinutes(device.lastSeen)) : "ไม่เคยเชื่อมต่อ"}</i>`;
    else {
      const latency = device.latency === "N/A" ? "N/A" : (device.latency && device.latency !== "timeout" ? parseLatencyToMs(device.latency) + 'ms' : 'Timeout');
      msg += `⚡ <b><u>ประสิทธิภาพระบบ</u></b>\n🎛️ CPU: <code>${device.cpuLoad || 0}%</code> | 🧩 RAM: <code>${device.memoryUsage || 0}%</code>\n🌡️ Temp: <code>${device.temp || 'N/A'}</code> | 🌐 Ping: <code>${latency}</code>\n⏱️ Uptime: <code>${device.uptime || '-'}</code>`;
    }
    msg += `\n\n${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- 🟢 คำสั่ง /problem ---
  if (command === '/problem' || command.startsWith('/problem@')) {
    const problems = [];
    devices.forEach(d => {
      if (d.isAcknowledged) return;
      if (getOfflineMinutes(d.lastSeen) > 3) { d.issue = "🔴 Offline"; problems.push(d); return; }
      const cpu = parseFloat(d.cpuLoad) || 0, ram = parseFloat(d.memoryUsage) || 0, latency = parseLatencyToMs(d.latency);
      let issues = [];
      if (cpu > thresholds.cpu) issues.push(`CPU ${cpu}%`);
      if (ram > thresholds.ram) issues.push(`RAM ${ram}%`);
      if (latency > thresholds.latency) issues.push(`Ping ${latency}ms`);
      if (issues.length > 0) { d.issue = `🟠 ${issues.join(', ')}`; problems.push(d); }
    });
    if (problems.length === 0) { await sendTelegramAlert(group.telegramBotToken, chatId, "✅ <b>ยอดเยี่ยม!</b>\nไม่มีอุปกรณ์ที่มีปัญหาค้างในระบบครับ"); return true; }
    let msg = `⚠️ <b><u>อุปกรณ์ที่พบปัญหา</u></b>\nพบทั้งหมด: <b>${problems.length}</b> เคส\n${separator}\n\n`;
    problems.forEach((d, i) => msg += `${i + 1}. <b>${d.name}</b>\n   └ 🆔 <code>${d.circuitId || '-'}</code>\n   └ ⚠️ ปัญหา: <i>${d.issue}</i>\n\n`);
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- คำสั่ง /top ---
  if (command === '/top' || command.startsWith('/top@')) {
    const online = devices.filter(d => getOfflineMinutes(d.lastSeen) <= 3);
    if (online.length === 0) { 
      await sendTelegramAlert(group.telegramBotToken, chatId, "⚠️ <b>ไม่มีข้อมูล:</b>\nไม่พบอุปกรณ์ที่ Online ในขณะนี้ครับ"); 
      return true; 
    }

    // วิเคราะห์ Arguments: /top [metric] [count]
    let metric = (args[1] || 'cpu').toLowerCase();
    let count = parseInt(args[2] || (isNaN(parseInt(args[1])) ? 5 : args[1]), 10);
    if (isNaN(count)) count = 5;

    // แก้ไขกรณีผู้ใช้พิมพ์แค่ /top 10 (ให้ metric เป็น cpu)
    if (!isNaN(parseInt(args[1]))) {
      metric = 'cpu';
      count = parseInt(args[1]);
    }

    let title = "";
    let emoji = "🔥";
    
    // เลือกการเรียงลำดับตาม Metric
    switch (metric) {
      case 'ram': case 'memory':
        metric = 'ram';
        online.sort((a, b) => (parseFloat(b.memoryUsage) || 0) - (parseFloat(a.memoryUsage) || 0));
        title = `Top ${count} การใช้งาน RAM สูงสุด`;
        emoji = "🧩";
        break;
      case 'temp': case 'temperature':
        metric = 'temp';
        online.sort((a, b) => (parseFloat(b.temp) || 0) - (parseFloat(a.temp) || 0));
        title = `Top ${count} อุณหภูมิสูงสุด`;
        emoji = "🌡️";
        break;
      case 'ping': case 'latency':
        metric = 'ping';
        online.sort((a, b) => parseLatencyToMs(b.latency) - parseLatencyToMs(a.latency));
        title = `Top ${count} Latency สูงสุด (ช้าสุด)`;
        emoji = "🌐";
        break;
      case 'hdd': case 'disk': case 'storage':
        metric = 'hdd';
        online.sort((a, b) => (parseFloat(b.storage) || 0) - (parseFloat(a.storage) || 0));
        title = `Top ${count} การใช้งาน Disk สูงสุด`;
        emoji = "💾";
        break;
      case 'uptime':
        online.sort((a, b) => parseUptimeToSeconds(b.uptime) - parseUptimeToSeconds(a.uptime));
        title = `Top ${count} อุปกรณ์ที่ Uptime นานที่สุด`;
        emoji = "⏱️";
        break;
      default: // cpu
        metric = 'cpu';
        online.sort((a, b) => (parseFloat(b.cpuLoad) || 0) - (parseFloat(a.cpuLoad) || 0));
        title = `Top ${count} การใช้งาน CPU สูงสุด`;
        emoji = "🎛️";
    }

    const topList = online.slice(0, count);
    let msg = `${emoji} <b><u>${title}</u></b>\n${separator}\n\n`;
    
    topList.forEach((d, i) => {
      let valueStr = "";
      if (metric === 'cpu') {
        const val = parseFloat(d.cpuLoad) || 0;
        valueStr = `CPU: <code>${val}%</code> | RAM: <code>${d.memoryUsage || 0}%</code>`;
      } else if (metric === 'ram') {
        const val = parseFloat(d.memoryUsage) || 0;
        valueStr = `RAM: <code>${val}%</code> | CPU: <code>${d.cpuLoad || 0}%</code>`;
      } else if (metric === 'temp') {
        valueStr = `Temp: <code>${d.temp || 'N/A'}°C</code>`;
      } else if (metric === 'ping') {
        const ms = parseLatencyToMs(d.latency);
        valueStr = `Ping: <code>${ms === 0 && d.latency === 'timeout' ? 'Timeout' : ms + 'ms'}</code>`;
      } else if (metric === 'hdd') {
        valueStr = `Disk: <code>${d.storage || 0}%</code>`;
      } else if (metric === 'uptime') {
        valueStr = `Uptime: <code>${d.uptime || '-'}</code>`;
      }
      
      msg += `${i + 1}. <b>${d.name}</b>\n   └ ${valueStr}\n\n`;
    });

    msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  return false;
};

exports.handleWebhook = async (req, res) => {
  res.sendStatus(200);
  let chatId, text;
  if (req.body.message && req.body.message.text) {
    chatId = req.body.message.chat.id.toString();
    text = req.body.message.text.trim();
  } else if (req.body.callback_query) {
    chatId = req.body.callback_query.message.chat.id.toString();
    text = req.body.callback_query.data.trim();
  } else return;

  try {
    const group = await prisma.deviceGroup.findFirst({
      where: { telegramChatId: chatId },
      include: { devices: { where: { status: { not: 'DELETED' } } } } 
    });
    if (!group || !group.telegramBotToken) {
      console.warn(`⚠️ [Telegram Webhook] Group not found or token missing for chatId: ${chatId}`);
      return;
    }
    const devices = group.devices || [];
    const thresholds = await getAlertThresholds();
    const args = text.split(' ');
    const command = args[0].toLowerCase();
    let handled = false;

    // 1. ตรวจสอบคำสั่ง Slash หรือ Keyword ก่อน
    if (command.startsWith('/')) {
      handled = await dispatchCommand(group, chatId, devices, thresholds, command, args);
      if (!handled && !await aiService.isAIEnabled(group.id)) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❌ ไม่พบข้อมูลอุปกรณ์หรือคำสั่งที่ระบุครับ`);
        return;
      }
    } else {
      // 🎯 [NEW] Keyword Matching เพื่อประหยัด Token AI
      const low = text.toLowerCase();
      
      // --- หมวดที่ 1: คำสั่งเฉพาะทางที่มีความสำคัญสูง (Specific Intent) ---
      if (['อันดับ', 'top', 'สูงสุด'].some(k => low.includes(k))) {
        let metric = 'cpu';
        if (['ram', 'memory', 'แรม', 'หน่วยความจำ', 'mem'].some(k => low.includes(k))) metric = 'ram';
        else if (['temp', 'temperature', 'ร้อน', 'อุณหภูมิ', 'องศา', 'heat'].some(k => low.includes(k))) metric = 'temp';
        else if (['hdd', 'disk', 'storage', 'พื้นที่', 'ความจุ', 'ดิสก์', 'ssd', 'harddisk'].some(k => low.includes(k))) metric = 'hdd';
        else if (['ping', 'latency', 'ช้า', 'แลค', 'หน่วง', 'ms', 'มิลลิวินาที'].some(k => low.includes(k))) metric = 'ping';
        else if (['uptime', 'ออนไลน์นาน', 'เปิดนาน', 'อัพไทม์', 'นาน'].some(k => low.includes(k))) metric = 'uptime';

        const matchCount = text.match(/\d+/);
        const count = matchCount ? matchCount[0] : '5';
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/top', ['/top', metric, count]);
      }
      else if (['offline', 'ออฟไลน์', 'เครื่องดับ', 'ติดต่อไม่ได้'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/offline', []);
      }
      else if (['ปัญหา', 'problem', 'เสีย', 'พัง'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/problem', []);
      }
      else if (['รายงาน', 'report', 'ดูรายงาน'].some(k => low.includes(k))) {
        // ย้ายคำว่า "สรุป" ออกจากหมวดนี้ถ้ามีคำว่า "อันดับ" ปนอยู่ (ซึ่งจะถูกดักข้างบนไปแล้ว)
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/report', []);
      }
      else if (['ช่วยเหลือ', 'ช่วยด้วย', 'help', 'ทำอะไรได้บ้าง', 'เมนู'].some(k => low.includes(k))) {
        handled = await dispatchCommand(group, chatId, devices, thresholds, '/help', []);
      }
      
      // --- หมวดที่ 2: ตรวจสอบการดูสถานะรายเครื่อง (Status) - ทำทีหลังเพื่อกันชื่อเครื่องไปซ้ำกับคำสั่ง ---
      if (!handled) {
        const statusKeywords = ['ขอข้อมูล', 'ข้อมูล', 'สถานะ', 'เช็ค', 'check', 'ดู', 'ขอดู'];
        // เอาคำว่า "ของ" ออกจากคีย์เวิร์ดเพราะกว้างเกินไป อาจขัดแย้งกับประโยคคุยทั่วไป
        const isStatusIntent = statusKeywords.some(k => low.includes(k));
        // ... rest of the logic
        
        // 🧼 ทำความสะอาดประโยคเพื่อหา "คำค้นหา" (Search Term)
        let searchTerm = low;
        statusKeywords.forEach(k => {
          searchTerm = searchTerm.replace(k, '');
        });
        searchTerm = searchTerm.trim();

        if (searchTerm || isStatusIntent) {
          // ค้นหาอุปกรณ์ (ใช้ Partial Match เหมือนคำสั่ง /status)
          const matched = devices.filter(d => 
            (d.name && d.name.toLowerCase().includes(searchTerm)) || 
            (d.circuitId && d.circuitId.toLowerCase().includes(searchTerm))
          );

          // เงื่อนไข: เจอเครื่อง และ (มีคำว่าข้อมูลปนอยู่ หรือ ชื่อที่พิมพ์มายาวกว่า 2 ตัวอักษรเพื่อป้องกันการพิมพ์มั่ว)
          if (matched.length > 0 && (isStatusIntent || searchTerm.length >= 2)) {
            handled = await dispatchCommand(group, chatId, devices, thresholds, '/status', ['/status', searchTerm]);
          }
        }
      }
    }

    // 2. ถ้ายังไม่ถูกจัดการ (ไม่มี Keyword ตรง) -> ส่งให้ AI ประมวลผลความหมายเชิงลึก
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
          return;
        }
      }
      // Fallback ถ้า AI ปิดอยู่ หรือ AI ไม่ตอบ
      if (!command.startsWith('/')) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `❓ <b>ไม่พบข้อมูลที่คุณต้องการครับ</b>\nกรุณาเลือกเมนูจากด้านล่าง หรือพิมพ์ /help ครับ`);
      }
    }
  } catch (error) {
    console.error("❌ Telegram Webhook Error:", error);
  }
};

// ==========================================
// ⏰ Cron Jobs
// ==========================================
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
              let msg = `🚨 <b>[DEVICE OFFLINE]</b>\n━━━━━━━━━━━━━━━━━━\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n🏷️ <b>รุ่น:</b> <code>${device.boardName || '-'}</code>`;
              if (device.ddnsName && device.ddnsName !== "N/A") msg += `\n☁️ <b>DDNS:</b> <code>${device.ddnsName}</code>`;
              msg += `\n⏳ <b>ขาดการติดต่อ:</b> <code>${new Date(device.lastSeen).toLocaleDateString('th-TH')} ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}</code>${adminInfo}\n\n━━━━━━━━━━━━━━━━━━\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อตรวจสอบ</a>`;
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }
        await prisma.managedDevice.update({ where: { id: device.id }, data: { isOfflineAlerted: true, isAcknowledged: false, lastAlertMessageIds: alertMsgIds } });
      }
    } catch (error) { console.error("❌ Offline Monitor Cron Error:", error); }
  });
};
