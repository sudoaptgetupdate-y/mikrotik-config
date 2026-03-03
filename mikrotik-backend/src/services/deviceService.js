const prisma = require('../config/prisma');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/cryptoUtil');
const { sendTelegramAlert } = require('../utils/telegramUtil'); // ✅ Import ตัวยิง Telegram

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

  // เตรียมข้อมูลเชื่อมกลุ่ม (Many-to-Many)
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

  // อัปเดตกลุ่มอุปกรณ์ (ลบของเก่าทิ้งแล้วใส่ใหม่)
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

exports.acknowledgeWarning = async (id, reason, warningData, actionUserId, actionUserName) => {
  const device = await prisma.managedDevice.findUnique({ 
    where: { id: parseInt(id) },
    include: { groups: true } // ✅ เพื่อดึงข้อมูลกลุ่มสำหรับแจ้งเตือน Telegram
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

  await prisma.deviceEventLog.create({
    data: {
      deviceId: parseInt(id),
      eventType: 'ONLINE', 
      details: `[Ack] รับทราบแล้ว: ${reason} (โดย ${actionUserName || 'Admin'})`
    }
  });

  await prisma.activityLog.create({ 
    data: { 
      userId: actionUserId, 
      action: "UPDATE_DEVICE", 
      details: `Acknowledged update on: ${device.name}. Reason: ${reason}` 
    } 
  });

  // 🌟 ✅ ยิงข้อความ Telegram แจ้งเตือนเวลา Admin กดรับทราบ (Ack)
  if (device.groups && device.groups.length > 0) {
    for (const group of device.groups) {
      const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` : '';
      const msg = `👁️‍🗨️ <b>[ISSUE ACKNOWLEDGED]</b>\nมีผู้รับทราบปัญหาแล้ว!\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n👤 <b>รับทราบโดย:</b> ${actionUserName || 'Admin'}\n📝 <b>หมายเหตุ/เหตุผล:</b> <i>${reason}</i>${adminInfo}`;
      
      if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
        await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
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