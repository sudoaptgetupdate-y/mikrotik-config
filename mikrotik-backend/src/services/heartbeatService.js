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
  if (tokenParts.length > 1 && !isNaN(parseInt(tokenParts[0]))) {
    const potentialId = parseInt(tokenParts[0]);
    const actualToken = tokenParts.slice(1).join('-'); 
    // ✅ เพิ่มการดึงข้อมูล groups เข้ามาด้วย
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
    // ✅ เพิ่มการดึงข้อมูล groups เข้ามาด้วย
    device = await prisma.managedDevice.findUnique({ 
      where: { id: matchedDeviceId },
      include: { groups: true }
    });
  }

  // ==========================================
  // 2. ดึงค่า Threshold จาก Database และตรวจสอบสถานะ
  // ==========================================
  const cpuVal = cpu ? parseInt(cpu) : 0;
  const ramVal = ram ? parseInt(ram) : 0;
  const latencyVal = latency ? parseFloat(latency) : 0; 
  const tempVal = temp ? parseFloat(temp) : 0; 

  const oldCpuVal = device.cpuLoad ? parseInt(device.cpuLoad) : 0;
  const oldRamVal = device.memoryUsage ? parseInt(device.memoryUsage) : 0;
  const oldLatencyVal = device.latency ? parseFloat(device.latency) : 0;
  const oldTempVal = device.temp ? parseFloat(device.temp) : 0; 

  // ดึงเกณฑ์แจ้งเตือน (Threshold) จาก Database (ถ้าไม่มีให้ใช้ค่า Default)
  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60 }; 
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ALERT_THRESHOLDS' } });
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      thresholds = { ...thresholds, ...parsed }; // ผสานค่าจาก DB ทับค่า Default
    }
  } catch (e) {
    console.error("Error loading thresholds:", e.message);
  }

  // ใช้ค่า Threshold แบบ Dynamic
  const isCpuHigh = cpuVal > thresholds.cpu;
  const isRamHigh = ramVal > thresholds.ram;
  const isLatencyHigh = latencyVal > thresholds.latency;
  const isTempHigh = tempVal > thresholds.temp; 

  const wasCpuHigh = oldCpuVal > thresholds.cpu;
  const wasRamHigh = oldRamVal > thresholds.ram;
  const wasLatencyHigh = oldLatencyVal > thresholds.latency;
  const wasTempHigh = oldTempVal > thresholds.temp;

  const isHighLoad = isCpuHigh || isRamHigh || isLatencyHigh || isTempHigh;
  const wasHighLoad = wasCpuHigh || wasRamHigh || wasLatencyHigh || wasTempHigh;

  const isNewCpuWarning = isCpuHigh && !wasCpuHigh;
  const isNewRamWarning = isRamHigh && !wasRamHigh;
  const isNewLatencyWarning = isLatencyHigh && !wasLatencyHigh;
  const isNewTempWarning = isTempHigh && !wasTempHigh; 

  const hasNewWarning = isNewCpuWarning || isNewRamWarning || isNewLatencyWarning || isNewTempWarning;

  // ==========================================
  // 3. ตรวจสอบสถานะ Online / Offline 
  // ==========================================
  let justCameOnline = false;
  if (device.lastSeen) {
    const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
    if (diffMinutes > 3) {
      justCameOnline = true;
      await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online (กลับมาเชื่อมต่อได้อีกครั้ง)' } });
    }
  }

  // ==========================================
  // 4. บันทึก Event Logs และจัดการสถานะ Ack พร้อมยิง Telegram
  // ==========================================
  let resetAckData = {};

  if (hasNewWarning) {
    const details = [];
    if (isNewCpuWarning) details.push(`CPU: ${cpuVal}%`);
    if (isNewRamWarning) details.push(`RAM: ${ramVal}%`);
    if (isNewLatencyWarning) details.push(`Ping: ${latencyVal}ms`);
    if (isNewTempWarning) details.push(`Temp: ${tempVal}°C`);
    
    await prisma.deviceEventLog.create({ 
      data: { 
        deviceId: device.id, 
        eventType: 'WARNING', 
        details: `High Load/Latency/Temp Detected - ${details.join(', ')}` 
      } 
    });

    // 🌟 ยิง Telegram แจ้งเตือนปัญหา
    const msg = `⚠️ <b>[HIGH LOAD ALERT]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n🌐 <b>IP:</b> ${remoteIp}\n\n🚨 <b>ตรวจพบปัญหา:</b>\n${details.map(d => `• ${d}`).join('\n')}`;
    
    if (device.groups && device.groups.length > 0) {
      for (const group of device.groups) {
        if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
        }
      }
    }

    // ปลดสถานะ Ack ทิ้งเพื่อให้แอดมินรับทราบปัญหาใหม่
    resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };
  } 
  else if (!isHighLoad) {
    if (wasHighLoad && !justCameOnline) {
      const recoveredDetails = [];
      if (wasCpuHigh) recoveredDetails.push(`CPU: ${cpuVal}% (ลดจาก ${oldCpuVal}%)`);
      if (wasRamHigh) recoveredDetails.push(`RAM: ${ramVal}% (ลดจาก ${oldRamVal}%)`);
      if (wasLatencyHigh) recoveredDetails.push(`Ping: ${latencyVal}ms (ลดจาก ${oldLatencyVal}ms)`);
      if (wasTempHigh) recoveredDetails.push(`Temp: ${tempVal}°C (ลดจาก ${oldTempVal}°C)`);
      
      const recoveryText = recoveredDetails.length > 0 
        ? `System [${recoveredDetails.join(', ')}] is back to normal (สถานะกลับสู่สภาวะปกติ)`
        : 'System is back to normal (สถานะกลับสู่สภาวะปกติ)';

      await prisma.deviceEventLog.create({ 
        data: { deviceId: device.id, eventType: 'ONLINE', details: recoveryText } 
      });

      // 🌟 ยิง Telegram แจ้งเตือนการฟื้นฟู (Recovery)
      const msg = `✅ <b>[SYSTEM RECOVERY]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n\n🟢 <b>สถานะกลับสู่ปกติ:</b>\n${recoveredDetails.map(d => `• ${d}`).join('\n')}`;
      
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
      storage: storage ? parseInt(storage) : device.storage, 
      temp: temp || device.temp, 
      uptime: uptime || device.uptime, 
      version: version || device.version, 
      latency: latency || device.latency, 
      ...resetAckData
    }
  });
};