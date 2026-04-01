const prisma = require('../config/prisma');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil'); 
const logService = require('./logService'); // 🚀 ใช้นำเข้า logService

// Helper: บันทึก History (Private Function)
const saveConfigHistory = async (userId, name, configData, managedDeviceId) => {
  if (configData && configData.selectedModel && configData.selectedModel.id) {
    try {
      await prisma.config.create({
        data: {
          projectName: name,
          inputData: JSON.stringify(configData), 
          generatedScript: "", 
          deviceModelId: parseInt(configData.selectedModel.id), 
          userId: parseInt(userId),
          managedDeviceId: parseInt(managedDeviceId) 
        }
      });
    } catch (err) {
      console.error("Error saving history:", err.message);
    }
  }
};

exports.checkDuplicate = async (name, circuitId, excludeId = null) => {
  const where = { status: { not: 'DELETED' } };
  if (excludeId) where.id = { not: parseInt(excludeId) };
  const results = { nameExists: false, circuitExists: false };
  if (name) {
    const d = await prisma.managedDevice.findFirst({ where: { ...where, name: { equals: name } } });
    if (d) results.nameExists = true;
  }
  if (circuitId) {
    const d = await prisma.managedDevice.findFirst({ where: { ...where, circuitId: { equals: circuitId, not: null } } });
    if (d) results.circuitExists = true;
  }
  return results;
};

exports.createDevice = async (name, circuitId, groupIds, configData, actionUserId, ipAddress) => {
  // 1. ตรวจสอบข้อมูลซ้ำ
  const existingDevice = await prisma.managedDevice.findFirst({
    where: {
      OR: [{ name: { equals: name } }, { circuitId: { equals: circuitId, not: null } }],
      status: { not: 'DELETED' }
    }
  });
  if (existingDevice) {
    if (existingDevice.name === name) throw new Error("CONFLICT: ชื่ออุปกรณ์นี้มีอยู่ในระบบแล้ว");
    if (existingDevice.circuitId === circuitId) throw new Error("CONFLICT: รหัสวงจรนี้มีอยู่ในระบบแล้ว");
  }

  const plainToken = crypto.randomUUID();
  const encryptedToken = encrypt(plainToken);
  const groupConnection = groupIds && Array.isArray(groupIds) && groupIds.length > 0 
    ? { connect: groupIds.map(id => ({ id: parseInt(id) })) } : undefined;

  // 2. สร้างอุปกรณ์
  const newDevice = await prisma.managedDevice.create({
    data: { 
      name, circuitId, userId: actionUserId, configData: configData || {}, status: "ACTIVE", apiToken: encryptedToken,
      ...(groupConnection && { groups: groupConnection }) 
    }
  });

  const combinedToken = `${newDevice.id}-${plainToken}`;
  let finalConfigData = configData;
  if (configData) {
    finalConfigData = { ...configData, token: combinedToken };
    await prisma.managedDevice.update({ where: { id: newDevice.id }, data: { configData: finalConfigData } });
    await saveConfigHistory(actionUserId, name, finalConfigData, newDevice.id);
  }

  // 3. บันทึก Log & แจ้งเตือน (รวมไว้ที่เดียว)
  await logService.createActivityLog({
    userId: actionUserId,
    action: 'CREATE_DEVICE',
    details: `เพิ่มอุปกรณ์ใหม่: ${name} (Circuit: ${circuitId || 'N/A'})`,
    ipAddress,
    deviceId: newDevice.id
  });

  return { newDevice, combinedToken, finalConfigData };
};

exports.updateDevice = async (id, name, circuitId, groupIds, status, configData, actionUserId, ipAddress) => {
  const deviceId = parseInt(id);
  const oldDevice = await prisma.managedDevice.findUnique({ where: { id: deviceId } });
  if (!oldDevice) throw new Error("NOT_FOUND");

  if (name || circuitId) {
    const duplicate = await prisma.managedDevice.findFirst({
      where: {
        OR: [
          (name && name !== oldDevice.name) ? { name: { equals: name } } : null,
          (circuitId && circuitId !== oldDevice.circuitId) ? { circuitId: { equals: circuitId, not: null } } : null
        ].filter(Boolean),
        id: { not: deviceId },
        status: { not: 'DELETED' }
      }
    });
    if (duplicate) {
      if (name && duplicate.name === name) throw new Error("CONFLICT: ชื่ออุปกรณ์ใหม่ซ้ำกับเครื่องอื่นในระบบ");
      if (circuitId && duplicate.circuitId === circuitId) throw new Error("CONFLICT: รหัสวงจรใหม่ซ้ำกับเครื่องอื่นในระบบ");
    }
  }

  const plainToken = decrypt(oldDevice.apiToken); 
  const combinedToken = `${deviceId}-${plainToken}`;
  let finalConfigData = configData;
  if (configData) finalConfigData = { ...configData, token: combinedToken }; 

  const groupUpdate = groupIds !== undefined 
    ? { set: Array.isArray(groupIds) ? groupIds.map(gid => ({ id: parseInt(gid) })) : [] } : undefined;

  const updatedDevice = await prisma.managedDevice.update({
    where: { id: deviceId },
    data: {
      configData: finalConfigData || oldDevice.configData, 
      ...(name !== undefined && { name }),           
      ...(circuitId !== undefined && { circuitId }),
      ...(status !== undefined && { status }),
      ...(groupUpdate && { groups: groupUpdate }) 
    }
  });

  if (finalConfigData) await saveConfigHistory(actionUserId, updatedDevice.name, finalConfigData, updatedDevice.id);

  // บันทึก Log
  await logService.createActivityLog({
    userId: actionUserId,
    action: "UPDATE_DEVICE",
    details: `แก้ไขข้อมูลอุปกรณ์: ${updatedDevice.name}`,
    ipAddress
  });

  return { updatedDevice, combinedToken, finalConfigData };
};

exports.getUserDevices = async () => {
  const devices = await prisma.managedDevice.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { groups: true } 
  });
  return devices.map(d => {
      const isOnline = d.lastSeen && (new Date() - d.lastSeen < 5 * 60 * 1000);
      return { ...d, isOnline, model: d.configData?.selectedModel || null, apiToken: `${d.id}-${decrypt(d.apiToken)}` };
  });
};

exports.getDeviceById = async (id) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) }, include: { groups: true } });
  if (!device) throw new Error("NOT_FOUND");
  const plainToken = decrypt(device.apiToken);
  device.apiToken = `${device.id}-${plainToken}`;
  if (device.configData) {
    if (device.configData.selectedModel) device.model = device.configData.selectedModel;
    device.configData.token = device.apiToken; 
  }
  return device;
};

exports.getDeviceHistory = async (id) => {
  return await prisma.config.findMany({
    where: { managedDeviceId: parseInt(id) }, 
    include: { deviceModel: { select: { name: true, imageUrl: true } }, user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20 
  });
};

exports.getDeviceEvents = async (id) => {
  return await prisma.deviceEventLog.findMany({
    where: { deviceId: parseInt(id) },
    orderBy: { createdAt: 'desc' },
    take: 100 
  });
};

exports.deleteDevice = async (id, actionUserId, ipAddress) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");
  await prisma.managedDevice.update({ where: { id: parseInt(id) }, data: { status: 'DELETED' } });
  
  await logService.createActivityLog({
    userId: actionUserId, action: "UPDATE_DEVICE", ipAddress,
    details: `เปลี่ยนสถานะอุปกรณ์เป็น INACTIVE: ${device.name}`
  });
};

exports.restoreDevice = async (id, actionUserId, ipAddress) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");
  await prisma.managedDevice.update({ where: { id: parseInt(id) }, data: { status: 'ACTIVE' } });
  
  await logService.createActivityLog({
    userId: actionUserId, action: "UPDATE_DEVICE", ipAddress,
    details: `กู้คืนสถานะอุปกรณ์: ${device.name}`
  });
};

exports.hardDeleteDevice = async (id, actionUserId, ipAddress) => {
  const deviceId = parseInt(id);
  const device = await prisma.managedDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("NOT_FOUND");
  await prisma.managedDevice.delete({ where: { id: deviceId } });

  await logService.createActivityLog({ 
    userId: actionUserId, action: "DELETE_DEVICE", ipAddress,
    details: `ลบอุปกรณ์ถาวรออกจากระบบ: ${device.name} (IP: ${device.currentIp || 'Unknown'})` 
  });
};

exports.acknowledgeWarning = async (id, reason, warningData, actionUserId, actionUserName, ipAddress) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) }, include: { groups: true } });
  if (!device) throw new Error("NOT_FOUND");

  let ackHistory = [];
  if (device.ackReason) {
    if (Array.isArray(device.ackReason)) { ackHistory = device.ackReason; } 
    else if (typeof device.ackReason === 'string') { try { ackHistory = JSON.parse(device.ackReason); } catch(e) {} }
  }
  ackHistory.push({ timestamp: new Date(), reason, warningData: warningData || null, userId: actionUserId, userName: actionUserName || "Unknown User" });

  const updatedDevice = await prisma.managedDevice.update({
    where: { id: parseInt(id) },
    data: { isAcknowledged: true, ackReason: ackHistory, ackByUserId: actionUserId, ackAt: new Date() }
  });

  await prisma.deviceEventLog.create({
    data: { deviceId: parseInt(id), eventType: 'WARNING', details: `[Ack] รับทราบปัญหา (${warningData || 'Unknown'}): ${reason} (โดย ${actionUserName || 'Admin'})` }
  });

  await logService.createActivityLog({ 
    userId: actionUserId, action: "UPDATE_DEVICE", ipAddress,
    details: `Acknowledge ปัญหาอุปกรณ์ ${device.name}: ${reason}` 
  });

  if (device.groups && device.groups.length > 0) {
    let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};
    for (const group of device.groups) {
      const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
      const msg = `👁️‍🗨️ <b>[ISSUE ACKNOWLEDGED]</b>\nมีผู้รับทราบปัญหาแล้ว!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⚠️ <b>ปัญหา:</b> <code>${warningData || 'Unknown'}</code>\n👤 <b>รับทราบโดย:</b> ${actionUserName || 'Admin'}\n📝 <b>หมายเหตุ/เหตุผล:</b> <i>${reason}</i>${adminInfo}`;
      if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
        await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, alertMsgIds[group.telegramChatId]);
      }
    }
  }
  return updatedDevice;
};

exports.logDownload = async (id, configId, actionUserId, ipAddress) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");
  await logService.createActivityLog({
    userId: actionUserId, action: "GENERATE_CONFIG", ipAddress,
    details: `Downloaded config for: ${device.name} ${configId ? `(History Version #${configId})` : '(Latest Version)'}`
  });
};

/**
 * 🤖 สรุปสถานะภาพรวมของระบบสำหรับ AI (Structured Context Builder)
 * ออกแบบมาเพื่อส่งให้ LLM (RAG) ประมวลผลโดยเฉพาะ
 */
exports.getAISummary = async (groupId = null) => {
  const where = { status: { not: 'DELETED' } };
  if (groupId) {
    where.groups = { some: { id: parseInt(groupId) } };
  }

  const devices = await prisma.managedDevice.findMany({
    where,
    select: {
      name: true,
      circuitId: true,
      lastSeen: true,
      cpuLoad: true,
      memoryUsage: true,
      storage: true,
      temp: true,
      uptime: true,
      latency: true,
      currentIp: true,
      boardName: true,
      version: true,
      isAcknowledged: true,
      groups: { select: { name: true } }
    }
  });

  const now = new Date();
  const offlineLimit = 3 * 60 * 1000; // 3 นาที

  const offlineDevices = devices.filter(d => !d.lastSeen || (now - new Date(d.lastSeen) > offlineLimit));
  const onlineDevices = devices.filter(d => d.lastSeen && (now - new Date(d.lastSeen) <= offlineLimit));
  
  // แยกเครื่องที่มีปัญหาโหลดสูง (Warning)
  const warningDevices = onlineDevices.filter(d => 
    (d.cpuLoad > 80) || (d.memoryUsage > 80) || (d.latency === 'timeout' || parseInt(d.latency) > 100)
  );

  let summary = `### [SYSTEM_DATETIME]: ${now.toLocaleString('th-TH')}\n`;
  summary += `### [NETWORK_STATS]\n`;
  summary += `- TOTAL: ${devices.length} | ONLINE: ${onlineDevices.length} | OFFLINE: ${offlineDevices.length} | WARNING: ${warningDevices.length}\n\n`;

  // 🔴 ส่งรายละเอียดเฉพาะเครื่องที่มีปัญหา (Detailed Alert)
  if (offlineDevices.length > 0 || warningDevices.length > 0) {
    summary += `### [ACTIVE_ISSUES_REPORT]\n`;
    offlineDevices.forEach(d => {
      summary += `- 🚨 OFFLINE: ${d.name} (${d.circuitId || 'N/A'}) | LastSeen: ${d.lastSeen ? new Date(d.lastSeen).toLocaleString('th-TH') : 'Never'}\n`;
    });
    warningDevices.forEach(d => {
      summary += `- ⚠️ WARNING: ${d.name} | CPU: ${d.cpuLoad}% | RAM: ${d.memoryUsage}% | PING: ${d.latency} | TEMP: ${d.temp}°C\n`;
    });
    summary += `\n`;
  }

  // 🔵 ข้อมูลสุขภาพและทรัพยากรของอุปกรณ์ทั้งหมด (All Devices Health & Resources)
  summary += `### [ALL_DEVICES_HEALTH_DATA]\n`;
  summary += `Format: Name | ID | Status | IP | Model/Ver | CPU | RAM | Disk | Temp | Ping | Uptime\n`;
  devices.forEach(d => {
    const isOff = !d.lastSeen || (now - new Date(d.lastSeen) > offlineLimit);
    const status = isOff ? 'OFFLINE' : 'ONLINE';
    const health = `${d.cpuLoad}%|${d.memoryUsage}%|${d.storage}%|${d.temp || 'N/A'}°C`;
    const net = `${d.currentIp}|${d.latency}|${d.uptime || '-'}`;
    summary += `- ${d.name} | ${d.circuitId || '-'} | ${status} | ${net} | ${d.boardName}/${d.version} | ${health}\n`;
  });
  summary += `\n`;

  // ดึง Log เฉพาะรายการที่ "สำคัญ" 3 รายการล่าสุด ของอุปกรณ์ในกลุ่มนี้
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logsWhere = { createdAt: { gte: today } };
  if (groupId) {
    logsWhere.device = { groups: { some: { id: parseInt(groupId) } } };
  }

  const recentLogs = await prisma.deviceEventLog.findMany({
    where: logsWhere,
    orderBy: { createdAt: 'desc' },
    take: 3, 
    include: { device: { select: { name: true } } }
  });

  if (recentLogs.length > 0) {
    summary += `### [LATEST_EVENTS]\n`;
    recentLogs.forEach(l => {
      summary += `- ${new Date(l.createdAt).toLocaleTimeString('th-TH')} | ${l.device.name} | ${l.eventType}\n`;
    });
  }

  return summary;
};