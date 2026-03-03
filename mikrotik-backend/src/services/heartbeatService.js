const prisma = require('../config/prisma');
const { decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil');

exports.processHeartbeat = async (token, payload, remoteIp) => {
  const { cpu, ram, storage, temp, latency, uptime, version } = payload;
  let matchedDeviceId = null;
  let device = null;

  // ==========================================
  // 1. ค้นหา Device ด้วย Token
  // ==========================================
  const tokenParts = token.split('-');
  
  // 🌟 แก้ไข: ใช้ Regex เช็คว่าเป็นตัวเลขล้วนๆ เท่านั้น
  if (tokenParts.length > 1 && /^\d+$/.test(tokenParts[0])) {
    const potentialId = parseInt(tokenParts[0]);
    const actualToken = tokenParts.slice(1).join('-'); 
    device = await prisma.managedDevice.findUnique({ 
      where: { id: potentialId },
      include: { groups: true } 
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
      where: { id: matchedDeviceId },
      include: { groups: true }
    });
  }

  // ==========================================
  // 2. ดึงค่า Threshold และตรวจสอบสถานะ
  // ==========================================
  const cpuVal = cpu ? parseInt(cpu) : 0;
  const ramVal = ram ? parseInt(ram) : 0;
  const storageVal = storage ? parseInt(storage) : 0; 
  const latencyVal = latency && latency !== "timeout" ? parseInt(latency.replace(/[^0-9]/g, ''), 10) : (latency === "timeout" ? 999 : 0); 
  const tempVal = temp ? parseFloat(temp) : 0; 

  const oldCpuVal = device.cpuLoad ? parseInt(device.cpuLoad) : 0;
  const oldRamVal = device.memoryUsage ? parseInt(device.memoryUsage) : 0;
  const oldStorageVal = device.storage ? parseInt(device.storage) : 0; 
  const oldLatencyVal = device.latency && device.latency !== "timeout" ? parseInt(device.latency.replace(/[^0-9]/g, ''), 10) : (device.latency === "timeout" ? 999 : 0);
  const oldTempVal = device.temp ? parseFloat(device.temp) : 0; 

  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; 
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ALERT_THRESHOLDS' } });
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      thresholds = { ...thresholds, ...parsed }; 
    }
  } catch (e) { console.error("Error loading thresholds:", e.message); }

  const isCpuHigh = cpuVal > thresholds.cpu;
  const isRamHigh = ramVal > thresholds.ram;
  const isStorageHigh = storageVal > thresholds.storage; 
  const isLatencyHigh = latencyVal > thresholds.latency;
  const isTempHigh = tempVal > thresholds.temp; 

  const wasCpuHigh = oldCpuVal > thresholds.cpu;
  const wasRamHigh = oldRamVal > thresholds.ram;
  const wasStorageHigh = oldStorageVal > thresholds.storage;
  const wasLatencyHigh = oldLatencyVal > thresholds.latency;
  const wasTempHigh = oldTempVal > thresholds.temp;

  const isHighLoad = isCpuHigh || isRamHigh || isStorageHigh || isLatencyHigh || isTempHigh;
  const wasHighLoad = wasCpuHigh || wasRamHigh || wasStorageHigh || wasLatencyHigh || wasTempHigh;

  const isNewCpuWarning = isCpuHigh && !wasCpuHigh;
  const isNewRamWarning = isRamHigh && !wasRamHigh;
  const isNewStorageWarning = isStorageHigh && !wasStorageHigh; 
  const isNewLatencyWarning = isLatencyHigh && !wasLatencyHigh;
  const isNewTempWarning = isTempHigh && !wasTempHigh; 

  const hasNewWarning = isNewCpuWarning || isNewRamWarning || isNewStorageWarning || isNewLatencyWarning || isNewTempWarning;

  // ==========================================
  // 3. ตรวจสอบสถานะ Online / Offline
  // ==========================================
  let justCameOnline = false;
  if (device.lastSeen) {
    const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
    if (diffMinutes > 3) {
      justCameOnline = true;
      
      await prisma.deviceEventLog.create({ 
        data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online (กลับมาเชื่อมต่อได้อีกครั้ง)' } 
      });

      const msgOnline = `🟢 <b>[DEVICE ONLINE] - กลับมาออนไลน์แล้ว</b>\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n✅ <b>สถานะ:</b> กลับมาเชื่อมต่อระบบสำเร็จ`;
      if (device.groups && device.groups.length > 0) {
        for (const group of device.groups) {
          if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msgOnline);
          }
        }
      }
    }
  }

  // ==========================================
  // 4. บันทึก Event Logs และจัดการสถานะ Ack
  // ==========================================
  let resetAckData = {};

  if (hasNewWarning) {
    const details = [];
    if (isNewCpuWarning) details.push(`CPU: ${cpuVal}%`);
    if (isNewRamWarning) details.push(`RAM: ${ramVal}%`);
    if (isNewStorageWarning) details.push(`Storage: ${storageVal}%`); 
    if (isNewLatencyWarning) details.push(`Ping: ${latencyVal}ms`);
    if (isNewTempWarning) details.push(`Temp: ${tempVal}°C`);
    
    await prisma.deviceEventLog.create({ 
      data: { 
        deviceId: device.id, 
        eventType: 'WARNING', 
        details: `High Load Detected - ${details.join(', ')}` 
      } 
    });

    const msg = `⚠️ <b>[HIGH LOAD ALERT]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n🌐 <b>IP:</b> ${remoteIp}\n\n🚨 <b>ตรวจพบปัญหา:</b>\n${details.map(d => `• ${d}`).join('\n')}`;
    
    if (device.groups && device.groups.length > 0) {
      for (const group of device.groups) {
        if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
        }
      }
    }

    resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };
  } 
  else if (!isHighLoad) {
    if (wasHighLoad && !justCameOnline) {
      const recoveredDetails = [];
      if (wasCpuHigh) recoveredDetails.push(`CPU: ${cpuVal}% (ลดจาก ${oldCpuVal}%)`);
      if (wasRamHigh) recoveredDetails.push(`RAM: ${ramVal}% (ลดจาก ${oldRamVal}%)`);
      if (wasStorageHigh) recoveredDetails.push(`Storage: ${storageVal}% (ลดจาก ${oldStorageVal}%)`); 
      if (wasLatencyHigh) recoveredDetails.push(`Ping: ${latencyVal}ms (ลดจาก ${oldLatencyVal}ms)`);
      if (wasTempHigh) recoveredDetails.push(`Temp: ${tempVal}°C (ลดจาก ${oldTempVal}°C)`);
      
      const recoveryText = recoveredDetails.length > 0 
        ? `System [${recoveredDetails.join(', ')}] is back to normal`
        : 'System is back to normal';

      await prisma.deviceEventLog.create({ 
        data: { deviceId: device.id, eventType: 'ONLINE', details: recoveryText } 
      });

      const msg = `✅ <b>[SYSTEM RECOVERY]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n🟢 <b>สถานะกลับสู่ปกติ:</b>\n${recoveredDetails.map(d => `• ${d}`).join('\n')}`;
      
      if (device.groups && device.groups.length > 0) {
        for (const group of device.groups) {
          if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
          }
        }
      }
    }
    resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };
  }

  // ==========================================
  // 5. อัปเดตข้อมูลลงฐานข้อมูล
  // ==========================================
  await prisma.managedDevice.update({
    where: { id: device.id },
    data: {
      lastSeen: new Date(), 
      currentIp: remoteIp, 
      cpuLoad: cpuVal, 
      memoryUsage: ramVal, 
      storage: storageVal, 
      temp: temp || device.temp, 
      uptime: uptime || device.uptime, 
      version: version || device.version, 
      latency: latency || device.latency, 
      ...resetAckData
    }
  });
};