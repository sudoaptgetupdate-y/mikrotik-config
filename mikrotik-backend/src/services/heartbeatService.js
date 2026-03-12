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
    // 🟢 กลับมาใช้ findUnique 
    const setting = await prisma.systemSetting.findUnique({ 
      where: { key: 'ALERT_THRESHOLDS' }
    });
    
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      
      thresholds = {
        cpu: Number(parsed.cpu ?? thresholds.cpu),
        ram: Number(parsed.ram ?? thresholds.ram),
        latency: Number(parsed.latency ?? parsed.ping ?? thresholds.latency),
        temp: Number(parsed.temp ?? parsed.temperature ?? thresholds.temp),
        storage: Number(parsed.storage ?? parsed.hdd ?? thresholds.storage),
      };
    }
  } catch (e) {
    console.error("⚠️ Error [Heartbeat] ไม่สามารถดึงค่า Thresholds ได้", e);
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
      // 🟢 คำนวณเวลาที่ออฟไลน์ไป และเพิ่มลงในข้อความ
      const offlineDurationStr = formatDuration(diffMinutesFromLastSeen);
      const msgOnline = `🟢 <b>[DEVICE ONLINE] - ระบบกลับมาออนไลน์</b>\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n✅ <b>สถานะ:</b> กลับมาเชื่อมต่อระบบได้ตามปกติแล้ว\n⏱️ <b>ระยะเวลาที่ขาดหาย:</b> ${offlineDurationStr}`;
      
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
          for (const group of device.groups) {
            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              // 🟢 เพิ่มชื่อผู้รับผิดชอบใน Warning
              const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
              const msg = `⚠️ <b>[HIGH LOAD ALERT]</b>\nพบอุปกรณ์ทำงานหนักต่อเนื่องเกิน 3 นาที!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n🚨 <b>ปัญหาที่พบ:</b>\n${details.map(d => `• ${d}`).join('\n')}${adminInfo}`;
              
              // 🟢 ส่งแล้วเก็บ ID ไว้
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
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
        // 🟢 คำนวณเวลาที่มีปัญหา
        let warningDurationStr = "ไม่ทราบเวลา";
        if (warningStartedAt) {
          const warningMins = (now - new Date(warningStartedAt)) / 1000 / 60;
          warningDurationStr = formatDuration(warningMins);
        }
        
        const msg = `✅ <b>[SYSTEM RECOVERY]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n🟢 <b>สถานะ:</b> การทำงานกลับสู่ภาวะปกติแล้ว\n⏱️ <b>ระยะเวลาที่มีปัญหา:</b> ${warningDurationStr}`;
        
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