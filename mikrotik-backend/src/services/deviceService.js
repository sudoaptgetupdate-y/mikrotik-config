const prisma = require('../config/prisma');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil'); 

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

exports.createDevice = async (name, circuitId, groupIds, configData, actionUserId) => {
  const plainToken = crypto.randomUUID();
  const encryptedToken = encrypt(plainToken);

  const groupConnection = groupIds && Array.isArray(groupIds) && groupIds.length > 0 
    ? { connect: groupIds.map(id => ({ id: parseInt(id) })) } 
    : undefined;

  const newDevice = await prisma.managedDevice.create({
    data: { 
      name, 
      circuitId, 
      userId: actionUserId, 
      configData: configData || {}, 
      status: "ACTIVE", 
      apiToken: encryptedToken,
      ...(groupConnection && { groups: groupConnection }) 
    }
  });

  const combinedToken = `${newDevice.id}-${plainToken}`;
  let finalConfigData = configData;

  if (configData) {
    finalConfigData = { ...configData, token: combinedToken };
    await prisma.managedDevice.update({
      where: { id: newDevice.id },
      data: { configData: finalConfigData }
    });
    await saveConfigHistory(actionUserId, name, finalConfigData, newDevice.id);
  }

  await prisma.activityLog.create({
    data: { userId: actionUserId, action: "CREATE_DEVICE", details: `Created device: ${name}` }
  });

  return { newDevice, combinedToken, finalConfigData };
};

exports.updateDevice = async (id, name, circuitId, groupIds, status, configData, actionUserId) => {
  const oldDevice = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!oldDevice) throw new Error("NOT_FOUND");

  const plainToken = decrypt(oldDevice.apiToken); 
  const combinedToken = `${parseInt(id)}-${plainToken}`;

  let finalConfigData = configData;
  if (configData) {
      finalConfigData = { ...configData, token: combinedToken }; 
  }

  const groupUpdate = groupIds !== undefined 
    ? { set: Array.isArray(groupIds) ? groupIds.map(gid => ({ id: parseInt(gid) })) : [] } 
    : undefined;

  const updatedDevice = await prisma.managedDevice.update({
    where: { id: parseInt(id) },
    data: {
      configData: finalConfigData || oldDevice.configData, 
      ...(name !== undefined && { name }),           
      ...(circuitId !== undefined && { circuitId }),
      ...(status !== undefined && { status }),
      ...(groupUpdate && { groups: groupUpdate }) 
    }
  });

  if (finalConfigData) {
    await saveConfigHistory(actionUserId, updatedDevice.name, finalConfigData, updatedDevice.id);
  }

  await prisma.activityLog.create({
    data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Updated config for device: ${updatedDevice.name}` }
  });

  return { updatedDevice, combinedToken, finalConfigData };
};

exports.getUserDevices = async () => {
  const devices = await prisma.managedDevice.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { groups: true } 
  });
  
  return devices.map(d => {
      const isOnline = d.lastSeen && (new Date() - new Date(d.lastSeen) < 5 * 60 * 1000);
      return { 
        ...d, 
        isOnline, 
        model: d.configData?.selectedModel || null,
        apiToken: `${d.id}-${decrypt(d.apiToken)}` 
      };
  });
};

exports.getDeviceById = async (id) => {
  const device = await prisma.managedDevice.findUnique({ 
    where: { id: parseInt(id) },
    include: { groups: true }
  });
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

exports.deleteDevice = async (id, actionUserId) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");

  await prisma.managedDevice.update({ where: { id: parseInt(id) }, data: { status: 'DELETED' } });
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Soft deleted device: ${device.name}` } });
};

exports.restoreDevice = async (id, actionUserId) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");

  await prisma.managedDevice.update({ where: { id: parseInt(id) }, data: { status: 'ACTIVE' } });
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Restored device: ${device.name}` } });
};

exports.hardDeleteDevice = async (id, actionUserId) => {
  const deviceId = parseInt(id);
  
  // 1. ตรวจสอบว่ามี Device อยู่จริงไหม
  const device = await prisma.managedDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("NOT_FOUND");

  // 2. สั่งลบถาวรจาก Database (Cascade ข้อมูลที่เกี่ยวข้องจะถูกลบไปด้วย)
  await prisma.managedDevice.delete({ 
    where: { id: deviceId } 
  });

  // 3. เก็บ Log กิจกรรมว่าใครเป็นคนลบถาวร (เก็บไว้ตรวจสอบย้อนหลังได้)
  await prisma.activityLog.create({ 
    data: { 
      userId: actionUserId, 
      action: "DELETE_DEVICE", 
      details: `Permanently deleted device: ${device.name} (IP: ${device.currentIp || 'Unknown'})` 
    } 
  });
};

exports.acknowledgeWarning = async (id, reason, warningData, actionUserId, actionUserName) => {
  const device = await prisma.managedDevice.findUnique({ 
    where: { id: parseInt(id) },
    include: { groups: true } 
  });
  
  if (!device) throw new Error("NOT_FOUND");

  let ackHistory = [];
  if (device.ackReason) {
    if (Array.isArray(device.ackReason)) { ackHistory = device.ackReason; } 
    else if (typeof device.ackReason === 'string') { try { ackHistory = JSON.parse(device.ackReason); } catch(e) {} }
  }

  ackHistory.push({
    timestamp: new Date(), reason: reason, warningData: warningData || null,
    userId: actionUserId, userName: actionUserName || "Unknown User" 
  });

  const updatedDevice = await prisma.managedDevice.update({
    where: { id: parseInt(id) },
    data: { isAcknowledged: true, ackReason: ackHistory, ackByUserId: actionUserId, ackAt: new Date() }
  });

  // 🟢 1. แก้ไขการสร้าง Event Log (เปลี่ยนเป็น WARNING และใส่ warningData เข้าไปใน details)
  await prisma.deviceEventLog.create({
    data: {
      deviceId: parseInt(id),
      eventType: 'WARNING', 
      details: `[Ack] รับทราบปัญหา (${warningData || 'Unknown'}): ${reason} (โดย ${actionUserName || 'Admin'})`
    }
  });

  // 🟢 2. อัปเดต Activity Log ให้ชัดเจนขึ้น
  await prisma.activityLog.create({ 
    data: { 
      userId: actionUserId, 
      action: "UPDATE_DEVICE", 
      details: `Acknowledged warning on: ${device.name} [Issue: ${warningData || 'Unknown'}]. Reason: ${reason}` 
    } 
  });

  // 🌟 3. อัปเดตข้อความใน Telegram 
  if (device.groups && device.groups.length > 0) {
    // 🟢 ดึง ID เดิมออกมา
    let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};

    for (const group of device.groups) {
      const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
      
      const msg = `👁️‍🗨️ <b>[ISSUE ACKNOWLEDGED]</b>\nมีผู้รับทราบปัญหาแล้ว!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⚠️ <b>ปัญหา:</b> <code>${warningData || 'Unknown'}</code>\n👤 <b>รับทราบโดย:</b> ${actionUserName || 'Admin'}\n📝 <b>หมายเหตุ/เหตุผล:</b> <i>${reason}</i>${adminInfo}`;
      
      if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
        // 🟢 ส่งแบบ Reply กลับไปหาข้อความแจ้งเตือนเดิม!
        const replyId = alertMsgIds[group.telegramChatId];
        await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, replyId);
      }
    }
  }
  
  return updatedDevice;
};

exports.logDownload = async (id, configId, actionUserId) => {
  const device = await prisma.managedDevice.findUnique({ where: { id: parseInt(id) } });
  if (!device) throw new Error("NOT_FOUND");

  await prisma.activityLog.create({
    data: { userId: actionUserId, action: "GENERATE_CONFIG", details: `Downloaded config for: ${device.name} ${configId ? `(History Version #${configId})` : '(Latest Version)'}` }
  });
};

/**
 * 🤖 สรุปสถานะภาพรวมของระบบสำหรับ AI
 * ดึงเฉพาะข้อมูลที่สำคัญเพื่อให้ AI เข้าใจบริบท
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
      uptime: true,
      latency: true,
      isAcknowledged: true,
      groups: { select: { name: true } }
    }
  });

  const now = new Date();
  const offlineLimit = 3 * 60 * 1000; // 3 นาที

  let summary = `📍 ข้อมูลกลุ่ม: ${groupId ? 'ระบุกลุ่ม' : 'ทั้งหมด'}\n`;
  summary += `📊 จำนวนอุปกรณ์ทั้งหมด: ${devices.length} รายการ\n`;

  const offlineDevices = devices.filter(d => !d.lastSeen || (now - new Date(d.lastSeen) > offlineLimit));
  const onlineDevices = devices.filter(d => d.lastSeen && (now - new Date(d.lastSeen) <= offlineLimit));

  summary += `🟢 Online: ${onlineDevices.length}\n`;
  summary += `🔴 Offline: ${offlineDevices.length}\n`;

  if (offlineDevices.length > 0) {
    summary += `\n❌ รายชื่อเครื่องที่ Offline:\n`;
    offlineDevices.forEach(d => {
      summary += `- ${d.name} (${d.circuitId || 'N/A'})\n`;
    });
  }

  // ดึง Log เหตุการณ์ล่าสุดของวันนี้
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentLogs = await prisma.deviceEventLog.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { device: { select: { name: true } } }
  });

  if (recentLogs.length > 0) {
    summary += `\n📜 เหตุการณ์สำคัญวันนี้:\n`;
    recentLogs.forEach(l => {
      summary += `- [${l.eventType}] ${l.device.name}: ${l.details} (${new Date(l.createdAt).toLocaleTimeString('th-TH')})\n`;
    });
  }

  return summary;
};