const prisma = require('../config/prisma');

// 1. ตกแต่ง HTML สำหรับ Telegram
exports.sanitizeHTML = (text) => {
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

// 2. แปลงค่า Latency เป็นตัวเลข ms
exports.parseLatencyToMs = (latencyStr) => {
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

// 3. ดึงค่า Thresholds สำหรับแจ้งเตือน
exports.getAlertThresholds = async () => {
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

// 4. คำนวณจำนวนนาทีที่ Offline
exports.getOfflineMinutes = (lastSeen) => {
  if (!lastSeen) return 9999;
  return (new Date() - new Date(lastSeen)) / 1000 / 60;
};

// 5. แปลง Uptime เป็นวินาที
exports.parseUptimeToSeconds = (uptimeStr) => {
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

// 6. ขยายคำค้นหา (ย่อ/เต็ม)
exports.expandSearchTerms = (keyword) => {
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

// 7. รูปแบบเวลาที่ผ่านไป
exports.formatTimeAgo = (minutes) => {
  if (minutes > 1440) return `${Math.floor(minutes / 1440)} วัน`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} ชม. ${Math.floor(minutes % 60)} นาที`;
  return `${Math.floor(minutes)} นาที`;
};

// 8. Template: รายงานสรุปกลุ่ม
exports.generateGroupReportText = (group, isDaily = false, thresholds) => {
  const devices = group.devices || [];
  let onlineHealthy = [], warningUnack = [], warningAck = [], offlineUnack = [], offlineAck = [], pending = [];
  
  devices.forEach(d => {
    if (!d.lastSeen) { pending.push(d); return; }
    const diffMinutes = (new Date() - new Date(d.lastSeen)) / 1000 / 60;
    if (diffMinutes > 3) {
      if (d.isAcknowledged) offlineAck.push(d); else offlineUnack.push(d);
      return;
    }
    const cpu = parseFloat(d.cpuLoad) || 0, ram = parseFloat(d.memoryUsage) || 0, storage = parseFloat(d.storage) || 0, temp = parseFloat(d.temp) || 0, latencyMs = exports.parseLatencyToMs(d.latency);
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
  if (pending.length > 0) { msg += `⏳ Pending: <b>${pending.length}</b> รายการ <i>(รอติดตั้ง)</i>\n`; }
  
  msg += `\n${separator}\n🚨 <b><u>ปัญหาที่ต้องตรวจสอบด่วน</u></b>\n`;
  if (warningUnack.length === 0 && offlineUnack.length === 0) msg += `✅ <i>ระบบทำงานปกติ ไม่พบปัญหาใหม่</i>\n`;
  else {
    offlineUnack.forEach(o => msg += `• <b>${o.name}</b>\n  └ 🛑 <b><code>[ OFFLINE ]</code></b> ขาดการติดต่อ\n`);
    warningUnack.forEach(p => msg += `• <b>${p.name}</b>\n  └ ⚠️ <code>${p.issues}</code>\n`);
  }

  if (pending.length > 0) {
    msg += `\n⏳ <b><u>อุปกรณ์ที่รอการติดตั้ง</u></b>\n`;
    pending.forEach(p => msg += `• <b>${p.name}</b>\n  └ 📦 <i>รอนำไปติดตั้งในพื้นที่</i>\n`);
  }

  if (warningAck.length > 0 || offlineAck.length > 0) {
    msg += `\n⌛ <b><u>อยู่ระหว่างดำเนินการ (Ack)</u></b>\n`;
    offlineAck.forEach(o => msg += `• <b>${o.name}</b>\n  └ 🛑 <b><code>[ OFFLINE ]</code></b> รับทราบแล้ว\n`);
    warningAck.forEach(a => msg += `• <b>${a.name}</b>\n  └ 🔸 <code>${a.issues}</code>\n`);
  }
  msg += `\n${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
  return msg;
};