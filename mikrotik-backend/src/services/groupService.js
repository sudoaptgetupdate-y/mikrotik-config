const prisma = require('../config/prisma');
const { setupTelegramWebhook } = require('../utils/telegramUtil'); // ✅ นำเข้าฟังก์ชันสำหรับตั้งค่า Webhook อัตโนมัติ

// ==========================================
// Group Management Service
// ==========================================
exports.createGroup = async (data) => {
  const { 
    name, adminName, adminContact, description, 
    telegramBotToken, telegramChatId, isNotifyEnabled,
    aiEnabled, aiGeminiKey, aiSystemPrompt
  } = data;
  
  const newGroup = await prisma.deviceGroup.create({
    data: {
      name,
      adminName, 
      adminContact,
      description,
      telegramBotToken,
      telegramChatId,
      isNotifyEnabled: isNotifyEnabled ?? true,
      aiEnabled: aiEnabled ?? false,
      aiGeminiKey,
      aiSystemPrompt
    }
  });

  // 🌟 แจ้งให้ Telegram ทราบ Webhook URL อัตโนมัติเมื่อสร้างกลุ่มและมี Token
  if (newGroup.isNotifyEnabled && newGroup.telegramBotToken) {
    await setupTelegramWebhook(newGroup.telegramBotToken);
  }

  return newGroup;
};

exports.getAllGroups = async () => {
  return await prisma.deviceGroup.findMany({
    include: {
      _count: {
        select: { devices: true } // นับจำนวนอุปกรณ์ในกลุ่มส่งกลับไปด้วย
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

exports.getGroupById = async (id) => {
  const group = await prisma.deviceGroup.findUnique({
    where: { id: parseInt(id) },
    include: {
      devices: {
        select: { id: true, name: true, currentIp: true, status: true } // ดึงข้อมูลอุปกรณ์ในกลุ่มมาแสดง
      }
    }
  });
  if (!group) throw new Error("GROUP_NOT_FOUND");
  return group;
};

exports.updateGroup = async (id, data) => {
  const { 
    name, description, telegramBotToken, telegramChatId, isNotifyEnabled, 
    adminName, adminContact, aiEnabled, aiGeminiKey, aiSystemPrompt 
  } = data;
  
  const updatedGroup = await prisma.deviceGroup.update({
    where: { id: parseInt(id) },
    data: { 
      name, description, telegramBotToken, telegramChatId, isNotifyEnabled, 
      adminName, adminContact, aiEnabled, aiGeminiKey, aiSystemPrompt 
    }
  });

  // 🌟 อัปเดตแจ้งให้ Telegram ทราบ Webhook URL อีกครั้งในกรณีที่มีการแก้ไข Token
  if (updatedGroup.isNotifyEnabled && updatedGroup.telegramBotToken) {
    await setupTelegramWebhook(updatedGroup.telegramBotToken);
  }

  return updatedGroup;
};

exports.deleteGroup = async (id) => {
  // 1. ตรวจสอบว่ากลุ่มนี้มีอุปกรณ์อยู่กี่ตัว
  const group = await prisma.deviceGroup.findUnique({
    where: { id: parseInt(id) },
    include: { _count: { select: { devices: true } } }
  });

  if (!group) throw new Error("GROUP_NOT_FOUND");

  // 2. ถ้ามีอุปกรณ์ผูกอยู่ ให้โยน Error พิเศษออกไป
  if (group._count.devices > 0) {
    throw new Error("GROUP_NOT_EMPTY");
  }

  // 3. ถ้ากลุ่มว่างเปล่า ถึงจะยอมให้ลบ
  return await prisma.deviceGroup.delete({
    where: { id: parseInt(id) }
  });
};

// ==========================================
// Device & Group Relation Service
// ==========================================
exports.addDeviceToGroup = async (groupId, deviceId) => {
  return await prisma.deviceGroup.update({
    where: { id: parseInt(groupId) },
    data: {
      devices: {
        connect: { id: parseInt(deviceId) } // สั่งเชื่อมความสัมพันธ์ Many-to-Many
      }
    }
  });
};

exports.removeDeviceFromGroup = async (groupId, deviceId) => {
  return await prisma.deviceGroup.update({
    where: { id: parseInt(groupId) },
    data: {
      devices: {
        disconnect: { id: parseInt(deviceId) } // สั่งตัดความสัมพันธ์
      }
    }
  });
};