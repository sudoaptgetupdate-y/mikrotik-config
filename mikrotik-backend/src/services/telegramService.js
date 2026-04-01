const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const aiService = require('./aiService');
const deviceService = require('./deviceService');
const { 
  sanitizeHTML, 
  parseLatencyToMs, 
  getAlertThresholds, 
  getOfflineMinutes, 
  parseUptimeToSeconds, 
  expandSearchTerms, 
  formatTimeAgo, 
  generateGroupReportText 
} = require('../utils/telegramFormatter');

// 1. กระจายคำสั่ง (Command Dispatcher)
const dispatchCommand = async (group, chatId, devices, thresholds, cmd, args, senderName = 'ไม่ระบุชื่อ') => {
  const command = cmd.toLowerCase();
  const separator = "━━━━━━━━━━━━━━━━━━";

  // --- /help ---
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

  // --- /ack (Acknowledge) ---
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
      const isDeviceOffline = getOfflineMinutes(matchedDevice.lastSeen) > 3;
      const hasProblem = matchedDevice.isOfflineAlerted || matchedDevice.isWarningAlerted || isDeviceOffline;
      if (!hasProblem) {
        await sendTelegramAlert(group.telegramBotToken, chatId, `✅ <b><u>สถานะปกติ</u></b>\n🖥 <b>ชื่อ:</b> <b>${matchedDevice.name}</b>\n\nอุปกรณ์นี้ทำงานเป็นปกติอยู่แล้ว ไม่จำเป็นต้องรับทราบปัญหาครับ`);
        return true;
      }
      await prisma.managedDevice.update({ where: { id: matchedDevice.id }, data: { isAcknowledged: true } });
      await prisma.deviceEventLog.create({ data: { deviceId: matchedDevice.id, eventType: 'ACKNOWLEDGE', details: `รับทราบปัญหาผ่าน Telegram (${senderName})` } });
      await sendTelegramAlert(group.telegramBotToken, chatId, `✅ <b><u>รับทราบปัญหาแล้ว</u></b>\n🖥 <b>ชื่อ:</b> <b>${matchedDevice.name}</b>\n✨ <b>วงจร:</b> <code>${matchedDevice.circuitId || '-'}</code>\n\n👌 ระบบบันทึกการรับทราบปัญหาโดย <b>${senderName}</b> เรียบร้อยแล้วครับ`);
    }
    return true;
  }

  // --- /event (Timeline) ---
  if (command === '/event' || command.startsWith('/event@')) {
    const searchKeyword = args.slice(1).join(' ').trim();
    let queryWhere = { deviceId: { in: devices.map(d => d.id) } };
    let title = "เหตุการณ์สำคัญล่าสุด";
    let subTitle = "แสดง 10 รายการล่าสุดในกลุ่ม";
    let refreshData = "/event";

    if (searchKeyword.startsWith('_id_')) {
      const id = parseInt(searchKeyword.replace('_id_', ''), 10);
      const device = devices.find(x => x.id === id);
      if (device) {
        queryWhere = { deviceId: id };
        title = `ประวัติเหตุการณ์: ${device.name}`;
        subTitle = `แสดง 10 รายการล่าสุดของอุปกรณ์นี้`;
        refreshData = `/event _id_${id}`;
      }
    }

    const logs = await prisma.deviceEventLog.findMany({
      where: queryWhere,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { device: true }
    });

    if (logs.length === 0) {
      await sendTelegramAlert(group.telegramBotToken, chatId, `ℹ️ <b><u>${title}</u></b>\nยังไม่มีบันทึกเหตุการณ์สำคัญครับ`);
      return true;
    }

    let msg = `📜 <b><u>${title}</u></b>\n${subTitle}\n${separator}\n\n`;
    logs.forEach((l, i) => {
      const date = new Date(l.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
      const time = new Date(l.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const emoji = l.eventType === 'OFFLINE' ? '🛑' : (l.eventType === 'ONLINE' ? '✅' : (l.eventType === 'ACKNOWLEDGE' ? '👌' : '⚠️'));
      msg += `${i + 1}. <code>${date} ${time}</code> | ${emoji} <b>${l.device.name}</b>\n   └ <i>${l.details}</i>\n\n`;
    });
    msg += `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">ดู Log ทั้งหมด</a>`;
    const keyboard = [[{ text: "🔄 ดึงข้อมูลล่าสุด", callback_data: refreshData }]];
    await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: keyboard });
    return true;
  }

  // --- /report ---
  if (command === '/report' || command.startsWith('/report@')) {
    const msg = generateGroupReportText(group, false, thresholds);
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }

  // --- /offline ---
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

  // --- /status ---
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
      const keyboard = currentItems.map(d => [{ text: `📱 ${d.name} (${d.circuitId || '-'})`, callback_data: `/status _id_${d.id}` }]);
      if (matched.length > end) { keyboard.push([{ text: `🔍 ดูเพิ่มเติม (รายการที่ ${end + 1}-${Math.min(end + 10, matched.length)})`, callback_data: `/status _page_${page + 1}_${searchKeyword}` }]); }
      const msgText = `⚠️ <b><u>พบข้อมูลทั้งหมด ${matched.length} รายการ</u></b>\nแสดงรายการที่ ${start + 1} - ${Math.min(end, matched.length)}\nกรุณาเลือกอุปกรณ์ที่ต้องการตรวจสอบ:`;
      await sendTelegramAlert(group.telegramBotToken, chatId, msgText, { inline_keyboard: keyboard });
      return true;
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
    const keyboard = [
      [{ text: "🔄 อัปเดตข้อมูล", callback_data: `/status _id_${device.id}` }, { text: "✅ รับทราบปัญหา", callback_data: `/ack _id_${device.id}` }],
      [{ text: "📜 ประวัติเหตุการณ์", callback_data: `/event _id_${device.id}` }]
    ];
    await sendTelegramAlert(group.telegramBotToken, chatId, msg, { inline_keyboard: keyboard });
    return true;
  }

  // --- /problem ---
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

  // --- /top ---
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
      let vStr = (metric === 'cpu' || metric === 'ram') ? `🎛️ CPU: <code>${d.cpuLoad || 0}%</code> | 🧩 RAM: <code>${d.memoryUsage || 0}%</code>` : 
                 (metric === 'temp') ? `🌡️ Temp: <code>${d.temp || 'N/A'}°C</code>` :
                 (metric === 'ping') ? `📶 Ping: <code>${parseLatencyToMs(d.latency)}ms</code>` :
                 (metric === 'hdd') ? `💾 Storage: <code>${d.storage || 0}%</code>` : `⏱️ Uptime: <code>${d.uptime || '-'}</code>`;
      msg += `${i + 1}. <b>${d.name}</b>\n   └ ${vStr}\n\n`;
    });
    msg += `${separator}\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อเปิดเว็บ</a>`;
    await sendTelegramAlert(group.telegramBotToken, chatId, msg);
    return true;
  }
  return false;
};

// 2. ฟังก์ชันประมวลผลคำสั่งจากข้อความทั่วไป
const processIncomingText = async (group, chatId, devices, thresholds, text, senderName) => {
  const low = text.toLowerCase();
  
  if (['อันดับ', 'top', 'สูงสุด'].some(k => low.includes(k))) {
    let metric = 'cpu';
    if (['ram', 'memory', 'แรม', 'หน่วยความจำ', 'mem'].some(k => low.includes(k))) metric = 'ram';
    else if (['temp', 'temperature', 'ร้อน', 'อุณหภูมิ', 'องศา', 'heat'].some(k => low.includes(k))) metric = 'temp';
    else if (['hdd', 'disk', 'storage', 'พื้นที่', 'ความจุ', 'ดิสก์', 'ssd', 'harddisk'].some(k => low.includes(k))) metric = 'hdd';
    else if (['ping', 'latency', 'ช้า', 'แลค', 'ms'].some(k => low.includes(k))) metric = 'ping';
    else if (['uptime', 'ออนไลน์นาน', 'อัพไทม์'].some(k => low.includes(k))) metric = 'uptime';
    const matchCount = text.match(/\d+/);
    return await dispatchCommand(group, chatId, devices, thresholds, '/top', ['/top', metric, matchCount ? matchCount[0] : '5'], senderName);
  }
  
  if (['offline', 'ออฟไลน์', 'เครื่องดับ', 'ติดต่อไม่ได้'].some(k => low.includes(k))) {
    if (!['เคย', 'ย้อนหลัง', 'ชั่วโมง', 'วัน', 'ประวัติ'].some(k => low.includes(k))) {
      return await dispatchCommand(group, chatId, devices, thresholds, '/offline', [], senderName);
    }
  }
  
  if (['ปัญหา', 'problem', 'เสีย', 'พัง'].some(k => low.includes(k))) {
    return await dispatchCommand(group, chatId, devices, thresholds, '/problem', [], senderName);
  }
  
  if (['รายงาน', 'report', 'ดูรายงาน'].some(k => low.includes(k))) {
    return await dispatchCommand(group, chatId, devices, thresholds, '/report', [], senderName);
  }
  
  if (['ช่วยเหลือ', 'ช่วยด้วย', 'help', 'ทำอะไรได้บ้าง', 'เมนู'].some(k => low.includes(k))) {
    return await dispatchCommand(group, chatId, devices, thresholds, '/help', [], senderName);
  }

  // ค้นหารายชื่อ/สถานะ
  const statusKeywords = ['ขอข้อมูล', 'ข้อมูล', 'สถานะ', 'เช็ค', 'check', 'ดู', 'ขอดู', 'แสดง', 'ทั้งหมด', 'รายชื่อ', 'ชื่อ', 'วงจร'];
  if (statusKeywords.some(k => low.includes(k))) {
    let searchTerm = low;
    statusKeywords.forEach(k => searchTerm = searchTerm.replace(new RegExp(k, 'g'), ''));
    searchTerm = searchTerm.trim();
    return await dispatchCommand(group, chatId, devices, thresholds, '/status', ['/status', searchTerm], senderName);
  }

  return false;
};

// 3. ฟังก์ชันหลักสำหรับจัดการ Webhook
exports.handleTelegramWebhook = async (req) => {
  let chatId, text, senderName = 'ไม่ระบุชื่อ';
  
  if (req.body.message && req.body.message.text) {
    chatId = req.body.message.chat.id.toString(); 
    text = req.body.message.text.trim();
    const from = req.body.message.from;
    if (from) senderName = from.first_name + (from.last_name ? ' ' + from.last_name : '') + (from.username ? ` (@${from.username})` : '');
  } else if (req.body.callback_query) {
    chatId = req.body.callback_query.message.chat.id.toString(); 
    text = req.body.callback_query.data.trim();
    const from = req.body.callback_query.from;
    if (from) senderName = from.first_name + (from.last_name ? ' ' + from.last_name : '') + (from.username ? ` (@${from.username})` : '');
  } else return;

  const group = await prisma.deviceGroup.findFirst({
    where: { telegramChatId: chatId },
    include: { devices: { where: { status: { not: 'DELETED' } } } } 
  });
  
  if (!group || !group.telegramBotToken) return;
  const devices = group.devices || [];
  const thresholds = await getAlertThresholds();
  
  let handled = false;
  if (text.startsWith('/')) {
    handled = await dispatchCommand(group, chatId, devices, thresholds, text.split(' ')[0], text.split(' '), senderName);
  } else {
    handled = await processIncomingText(group, chatId, devices, thresholds, text, senderName);
  }

  // จัดการด้วย AI หากยังไม่มีใครตอบ
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
          await dispatchCommand(group, chatId, devices, thresholds, cmdArgs[0], cmdArgs, senderName);
        } else {
          await sendTelegramAlert(group.telegramBotToken, chatId, sanitizeHTML(aiReply));
        }
      }
    } else if (text.startsWith('/')) {
      await sendTelegramAlert(group.telegramBotToken, chatId, `❌ ไม่พบข้อมูลอุปกรณ์หรือคำสั่งที่ระบุครับ`);
    }
  }
};