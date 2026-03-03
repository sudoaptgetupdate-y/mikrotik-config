const prisma = require('../config/prisma');
const { decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil');

// ✅ ฟังก์ชันช่วยแปลงค่า Latency จากรูปแบบต่าง ๆ เป็นหน่วย ms
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
  if (str.includes('us')) return Math.round(num / 1000); // 1300us -> 1ms
  if (str.includes('s') && !str.includes('m') && !str.includes('u')) return Math.round(num * 1000); // 1s -> 1000ms
  return Math.round(num);
};

exports.processHeartbeat = async (token, payload, remoteIp) => {
  const { cpu, ram, storage, temp, latency, uptime, version } = payload;
  let matchedDeviceId = null;
  let device = null;

  const tokenParts = token.split('-');
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

  // ✅ ใช้ฟังก์ชัน parse ใหม่ที่นี่
  const cpuVal = cpu ? parseInt(cpu) : 0;
  const ramVal = ram ? parseInt(ram) : 0;
  const storageVal = storage ? parseInt(storage) : 0; 
  const latencyVal = parseLatencyToMs(latency); 
  const tempVal = temp ? parseFloat(temp) : 0; 

  const oldCpuVal = device.cpuLoad ? parseInt(device.cpuLoad) : 0;
  const oldRamVal = device.memoryUsage ? parseInt(device.memoryUsage) : 0;
  const oldStorageVal = device.storage ? parseInt(device.storage) : 0; 
  const oldLatencyVal = parseLatencyToMs(device.latency);
  const oldTempVal = device.temp ? parseFloat(device.temp) : 0; 

  let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 }; 
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ALERT_THRESHOLDS' } });
    if (setting && setting.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      thresholds = { ...thresholds, ...parsed }; 
    }
  } catch (e) {}

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

  const hasNewWarning = (isCpuHigh && !wasCpuHigh) || (isRamHigh && !wasRamHigh) || 
                       (isStorageHigh && !wasStorageHigh) || (isLatencyHigh && !wasLatencyHigh) || 
                       (isTempHigh && !wasTempHigh);

  let justCameOnline = false;
  if (device.lastSeen) {
    const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
    if (diffMinutes > 3) {
      justCameOnline = true;
      await prisma.deviceEventLog.create({ 
        data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online' } 
      });
      const msgOnline = `🟢 <b>[DEVICE ONLINE]</b>\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n✅ <b>สถานะ:</b> กลับมาเชื่อมต่อระบบสำเร็จ`;
      if (device.groups) {
        for (const group of device.groups) {
          if (group.isNotifyEnabled && group.telegramBotToken) {
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msgOnline);
          }
        }
      }
    }
  }

  let resetAckData = {};
  if (hasNewWarning) {
    const details = [];
    if (isCpuHigh) details.push(`CPU: ${cpuVal}%`);
    if (isRamHigh) details.push(`RAM: ${ramVal}%`);
    if (isStorageHigh) details.push(`Storage: ${storageVal}%`); 
    if (isLatencyHigh) details.push(`Ping: ${latencyVal}ms`);
    if (isTempHigh) details.push(`Temp: ${tempVal}°C`);
    
    await prisma.deviceEventLog.create({ 
      data: { deviceId: device.id, eventType: 'WARNING', details: `High Load - ${details.join(', ')}` } 
    });

    const msg = `⚠️ <b>[HIGH LOAD ALERT]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n🚨 <b>ปัญหา:</b>\n${details.map(d => `• ${d}`).join('\n')}`;
    if (device.groups) {
      for (const group of device.groups) {
        if (group.isNotifyEnabled && group.telegramBotToken) {
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
        }
      }
    }
    resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };
  } else if (!isHighLoad && wasHighLoad && !justCameOnline) {
    const msg = `✅ <b>[SYSTEM RECOVERY]</b>\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n\n🟢 <b>สถานะกลับสู่ปกติแล้ว</b>`;
    if (device.groups) {
      for (const group of device.groups) {
        if (group.isNotifyEnabled && group.telegramBotToken) {
          await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
        }
      }
    }
    resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };
  }

  await prisma.managedDevice.update({
    where: { id: device.id },
    data: {
      lastSeen: new Date(), currentIp: remoteIp, cpuLoad: cpuVal, memoryUsage: ramVal, 
      storage: storageVal, temp: temp || device.temp, uptime: uptime || device.uptime, 
      version: version || device.version, latency: latency || device.latency, ...resetAckData
    }
  });
};