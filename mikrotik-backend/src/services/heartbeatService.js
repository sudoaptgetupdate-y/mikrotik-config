const prisma = require('../config/prisma');
const { decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil');

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

const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes) || minutes < 0) return "ไม่ทราบเวลา";
  if (minutes < 1) return "ไม่ถึง 1 นาที";
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)} วัน ${Math.floor((minutes % 1440) / 60)} ชม.`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} ชม. ${Math.floor(minutes % 60)} นาที`;
  return `${Math.floor(minutes)} นาที`;
};

exports.processHeartbeat = async (token, payload, remoteIp) => {
  const { cpu, ram, storage, temp, latency, uptime, version, boardName, ddnsName } = payload;
  let matchedDeviceId = null;
  let device = null;

  // ==========================================
  // 1. ค้นหา Device
  // ==========================================
  const tokenParts = token.split('-');
  if (tokenParts.length > 1 && /^\d+$/.test(tokenParts[0])) {
    const potentialId = parseInt(tokenParts[0]);
    const actualToken = tokenParts.slice(1).join('-'); 
    device = await prisma.managedDevice.findUnique({ 
      where: { id: potentialId }, include: { groups: true } 
    });
    if (device) {
      let isMatch = false;
      if (device.apiToken === actualToken) { isMatch = true; } 
      else { try { if (decrypt(device.apiToken) === actualToken) isMatch = true; } catch(err) {} }
      if (isMatch) matchedDeviceId = device.id;
    }
  }

  if (!matchedDeviceId) {
    const allDevices = await prisma.managedDevice.findMany({ select: { id: true, apiToken: true } });
    for (const d of allDevices) {
      if (d.apiToken === token) { matchedDeviceId = d.id; break; }
      try { if (decrypt(d.apiToken) === token) { matchedDeviceId = d.id; break; } } catch (err) {}
    }
    if (!matchedDeviceId) throw new Error("NOT_FOUND");
    device = await prisma.managedDevice.findUnique({ 
      where: { id: matchedDeviceId }, include: { groups: true }
    });
  }

  // ==========================================
  // 2. ดึงค่า Threshold และประเมิน Load ปัจจุบัน
  // ==========================================
  const cpuVal = cpu ? parseInt(cpu) : 0;
  const ramVal = ram ? parseInt(ram) : 0;
  const storageVal = storage ? parseInt(storage) : 0; 
  const latencyVal = parseLatencyToMs(latency); 
  const tempVal = temp ? parseFloat(temp) : 0; 

  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; 
  try {
    const setting = await prisma.systemSetting.findUnique({ 
      where: { key: 'ALERT_THRESHOLDS' }
    });
    
    if (setting && setting.value) {
      let parsed = setting.value;
      
      // 🟢 แกะ String วนลูป
      while (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { break; }
      }

      // 🟢 บังคับเป็นพิมพ์เล็ก
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
  } catch (e) {
    console.error("⚠️ [Heartbeat] ไม่สามารถดึงค่า Thresholds ได้", e);
  }

  const isCpuHigh = cpuVal > thresholds.cpu;
  const isRamHigh = ramVal > thresholds.ram;
  const isStorageHigh = storageVal > thresholds.storage; 
  const isLatencyHigh = latencyVal > thresholds.latency;
  const isTempHigh = tempVal > thresholds.temp; 

  const isHighLoad = isCpuHigh || isRamHigh || isStorageHigh || isLatencyHigh || isTempHigh;

  const now = new Date();
  let { warningStartedAt, isWarningAlerted, isOfflineAlerted, isAcknowledged } = device;

  // ==========================================
  // 3. ตรวจสอบการกลับมาออนไลน์ (Offline Recovery)
  // ==========================================
  const diffMinutesFromLastSeen = device.lastSeen ? (now - new Date(device.lastSeen)) / 1000 / 60 : 0;
  let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};
  
  if (isOfflineAlerted || diffMinutesFromLastSeen > 3) {
    await prisma.deviceEventLog.create({ 
      data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online' } 
    });

    if (isOfflineAlerted && device.groups && device.groups.length > 0) {
      const offlineDurationStr = formatDuration(diffMinutesFromLastSeen);
      const separator = "━━━━━━━━━━━━━━━━━━";
      const msgOnline = `✅ <b><u>[ DEVICE ONLINE ]</u></b>\n${separator}\n` +
                        `🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n` +
                        `✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n` +
                        `📊 <b>สถานะ:</b> <u>กลับมาออนไลน์ปกติแล้ว</u>\n` +
                        `⏱️ <b>ขาดหายไป:</b> <code>${offlineDurationStr}</code>\n` +
                        `⏳ <b>เวลาบันทึก:</b> <code>${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}</code>\n` +
                        `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">ดูรายละเอียด</a>`;
      
      for (const group of device.groups) {
        if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
          const replyId = alertMsgIds[group.telegramChatId];
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msgOnline, replyId);
          delete alertMsgIds[group.telegramChatId];
        }
      }
    }
    isOfflineAlerted = false;
    isAcknowledged = false; 
  }

  // ==========================================
  // 4. ตรวจสอบเงื่อนไข Warning 3 นาที (Flap Detection)
  // ==========================================
  if (isHighLoad) {
    if (!warningStartedAt) {
      warningStartedAt = now;
    } else {
      const warningDurationMins = (now - new Date(warningStartedAt)) / 1000 / 60;
      
      if (warningDurationMins >= 3 && !isWarningAlerted) {
        const details = [];
        if (isCpuHigh) details.push(`CPU: ${cpuVal}%`);
        if (isRamHigh) details.push(`RAM: ${ramVal}%`);
        if (isStorageHigh) details.push(`Storage: ${storageVal}%`); 
        if (isLatencyHigh) details.push(`Ping: ${latencyVal}ms`);
        if (isTempHigh) details.push(`Temp: ${tempVal}°C`);
        
        await prisma.deviceEventLog.create({ 
          data: { deviceId: device.id, eventType: 'WARNING', details: `High Load: ${details.join(', ')}` } 
        });

        if (device.groups && device.groups.length > 0) {
          const separator = "━━━━━━━━━━━━━━━━━━";
          for (const group of device.groups) {
            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b><u>ผู้รับผิดชอบดูแล</u></b>\n👤 ชื่อ: ${group.adminName || '-'}\n📞 ติดต่อ: ${group.adminContact || '-'}` : '';
              
              const msg = `⚠️ <b><u>[ HIGH LOAD ALERT ]</u></b>\n${separator}\n` +
                          `🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n` +
                          `✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n` +
                          `🚨 <b><u>ปัญหาที่พบ (เกิน 3 นาที)</u></b>\n` +
                          `${details.map(d => `• <code>${d}</code>`).join('\n')}\n\n` +
                          `⏳ <b>เวลา:</b> <code>${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}</code>` +
                          `${adminInfo}\n` +
                          `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อจัดการ</a>`;

              const keyboard = [[{ text: "✅ รับทราบปัญหา", callback_data: `/ack _id_${device.id}` }]];
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, { inline_keyboard: keyboard });
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }
        
        isWarningAlerted = true;
        isAcknowledged = false; 
      }
    }
  } else {
    // ==========================================
    // 5. สถานะกลับสู่ภาวะปกติ (Warning Recovery)
    // ==========================================
    if (isWarningAlerted) {
      await prisma.deviceEventLog.create({ 
        data: { deviceId: device.id, eventType: 'ONLINE', details: 'System load is back to normal' } 
      });

      if (device.groups && device.groups.length > 0) {
        let warningDurationStr = "ไม่ทราบเวลา";
        if (warningStartedAt) {
          const warningMins = (now - new Date(warningStartedAt)) / 1000 / 60;
          warningDurationStr = formatDuration(warningMins);
        }
        
        const separator = "━━━━━━━━━━━━━━━━━━";
        const msg = `✅ <b><u>[ SYSTEM RECOVERY ]</u></b>\n${separator}\n` +
                    `🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n` +
                    `✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n` +
                    `📊 <b>สถานะ:</b> <u>การทำงานกลับสู่ภาวะปกติแล้ว</u>\n` +
                    `⏱️ <b>ระยะเวลาที่มีปัญหา:</b> <code>${warningDurationStr}</code>\n` +
                    `⏳ <b>เวลาบันทึก:</b> <code>${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}</code>\n` +
                    `${separator}\n🌐 <b>Dashboard:</b> <a href="https://mikrotik.ntnakhon.com">ดูภาพรวม</a>`;
        
        for (const group of device.groups) {
          if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
            const replyId = alertMsgIds[group.telegramChatId];
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, replyId);
            delete alertMsgIds[group.telegramChatId];
          }
        }
      }
    }
    
    warningStartedAt = null; 
    isWarningAlerted = false; 
    isAcknowledged = false;
  }

  // ==========================================
  // 6. อัปเดตข้อมูลลงฐานข้อมูล (ใน heartbeatService.js)
  // ==========================================
  await prisma.managedDevice.update({
    where: { id: device.id },
    data: {
      lastSeen: now, 
      currentIp: remoteIp, 
      cpuLoad: cpuVal, 
      memoryUsage: ramVal, 
      storage: storageVal, 
      temp: temp || device.temp, 
      uptime: uptime || device.uptime, 
      version: version || device.version, 
      latency: latency || device.latency, 
      
      boardName: boardName || device.boardName,
      ddnsName: ddnsName || device.ddnsName, 

      warningStartedAt,
      isWarningAlerted,
      isOfflineAlerted,
      isAcknowledged,
      lastAlertMessageIds: alertMsgIds
    }
  });
};