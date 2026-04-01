const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');

exports.createActivityLog = async ({ userId, action, details, ipAddress, userNameOverride, deviceId }) => {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress
      }
    });

    // 📢 1. ส่งแจ้งเตือนผ่าน Telegram สำหรับ Audit Log กลาง (Group Admin ส่วนกลาง)
    triggerAuditNotification(log, userNameOverride).catch(err => console.error("Audit Notify Error:", err));

    // 📢 2. ส่งแจ้งเตือนเข้า Telegram ของกลุ่มอุปกรณ์ (Device Group) หากเป็นกิจกรรมเกี่ยวกับอุปกรณ์
    if (deviceId && (action === 'CREATE_DEVICE' || action === 'DELETE_DEVICE')) {
      triggerDeviceNotification(deviceId, action, userId, userNameOverride).catch(err => console.error("Device Group Notify Error:", err));
    }

    return log;
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
};

const triggerDeviceNotification = async (deviceId, action, userId, userNameOverride) => {
  try {
    // 1. ดึงข้อมูลอุปกรณ์พร้อมกลุ่มที่สังกัด
    const device = await prisma.managedDevice.findUnique({
      where: { id: deviceId },
      include: { 
        groups: { 
          where: { isNotifyEnabled: true, telegramBotToken: { not: null }, telegramChatId: { not: null } } 
        } 
      }
    });

    if (!device || !device.groups || device.groups.length === 0) return;

    // 2. ดึงข้อมูลผู้ดำเนินการ
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, firstName: true, lastName: true } });
    const userName = userNameOverride || (user ? `${user.firstName} ${user.lastName}` : 'System');

    // 3. เตรียมข้อความแจ้งเตือน
    const emoji = action === 'CREATE_DEVICE' ? '🆕' : '🗑️';
    const actionText = action === 'CREATE_DEVICE' ? 'เพิ่มอุปกรณ์ใหม่เข้าในกลุ่ม' : 'ลบอุปกรณ์ออกจากกลุ่ม';
    const statusText = action === 'CREATE_DEVICE' ? '⏳ <b>รอการติดตั้ง</b>' : '❌ Inactive';

    const message = `${emoji} <b><u>[ ${actionText} ]</u></b>\n━━━━━━━━━━━━━━━━━━\n🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n🏷️ <b>รุ่น:</b> <code>${device.boardName || '-'}</code>\n📊 <b>สถานะเริ่มต้น:</b> ${statusText}\n\n👤 <b>ผู้ดำเนินการ:</b> ${userName}\n📅 <b>เวลา:</b> <code>${new Date().toLocaleString('th-TH')}</code>\n━━━━━━━━━━━━━━━━━━\n📦 <i>กรุณานำ Script ไปรันที่ตัวอุปกรณ์เพื่อเริ่มการเชื่อมต่อ</i>`;

    // 4. ส่งเข้าทุกกลุ่มที่อุปกรณ์นี้สังกัดอยู่
    for (const group of device.groups) {
      await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, message);
    }
  } catch (error) {
    console.error('❌ triggerDeviceNotification failed:', error.message);
  }
};

const triggerAuditNotification = async (log, userNameOverride) => {
  try {
    // กำหนดประเภท Action ที่จะให้แจ้งเตือน
    const notifyActions = [
      'LOGIN', 'LOGIN_FAIL', 'UPDATE_SETTING', 'CREATE_USER', 'DELETE_USER', 
      'CREATE_GROUP', 'DELETE_GROUP', 'UPDATE_GROUP', 'MANAGE_GROUP_DEVICES',
      'TOGGLE_USER_STATUS', 'CREATE_MODEL', 'DELETE_MODEL', 'UPDATE_MODEL',
      'GENERATE_CONFIG', 'GENERATE_VPN'
    ];
    
    if (!notifyActions.includes(log.action)) return;

    // ดึงค่าการตั้งค่า Telegram Audit จาก Database
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'AUDIT_TELEGRAM_CONFIG' } });
    if (!setting || !setting.value) return;

    // แก้ไขปัญหา Double Stringify โดยการ Parse จนกว่าจะได้ Object
    let config = setting.value;
    while (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        break;
      }
    }

    if (!config || typeof config !== 'object' || !config.enabled || !config.botToken || !config.chatId) {
      return;
    }

    // ดึงข้อมูล User เพื่อเอามาใส่ในข้อความ
    const user = await prisma.user.findUnique({ 
      where: { id: log.userId }, 
      select: { username: true, firstName: true, lastName: true } 
    });
    
    let userName = user ? `${user.firstName} ${user.lastName} (@${user.username})` : 'System';
    
    // หากมี override ให้ใช้ override ก่อน
    if (userNameOverride) {
      userName = userNameOverride;
    } else if (log.action === 'LOGIN_FAIL' && !user) {
      // กรณี LOGIN_FAIL และไม่เจอ User ในระบบ (อาจพิมพ์ username ผิด)
      userName = 'Guest / Unknown User';
    }
    
    const emojiMap = {
      LOGIN: '🔑',
      LOGIN_FAIL: '🚫',
      UPDATE_SETTING: '⚙️',
      CREATE_USER: '👤',
      DELETE_USER: '🗑️',
      CREATE_GROUP: '📁',
      DELETE_GROUP: '📂',
      UPDATE_GROUP: '✏️',
      MANAGE_GROUP_DEVICES: '🔗',
      TOGGLE_USER_STATUS: '🔒',
      CREATE_MODEL: '📦',
      DELETE_MODEL: '🗑️',
      UPDATE_MODEL: '✏️',
      GENERATE_CONFIG: '🛠️',
      GENERATE_VPN: '🛡️'
    };

    const emoji = emojiMap[log.action] || '📝';
    const message = `${emoji} <b><u>[ AUDIT LOG ALERT ]</u></b>\n━━━━━━━━━━━━━━━━━━\n<b>กิจกรรม:</b> <code>${log.action}</code>\n<b>ผู้ดำเนินการ:</b> <b>${userName}</b>\n<b>รายละเอียด:</b> <i>${log.details || '-'}</i>\n<b>IP Address:</b> <code>${log.ipAddress || '-'}</code>\n<b>เวลา:</b> <code>${new Date().toLocaleString('th-TH')}</code>\n━━━━━━━━━━━━━━━━━━`;

    await sendTelegramAlert(config.botToken, config.chatId, message);
  } catch (err) {
    console.error('❌ triggerAuditNotification failed:', err.message);
  }
};

exports.getActivityLogs = async (page, limit, search, startDate, endDate) => {
  const skip = (page - 1) * limit;
  let whereClause = {};

  if (search) {
    whereClause.OR = [
      { details: { contains: search } },
      { user: { username: { contains: search } } }
    ];
  }

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) whereClause.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: whereClause,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: limit
    }),
    prisma.activityLog.count({ where: whereClause })
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};

exports.getEventSummary = async (days = 1) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await prisma.deviceEventLog.groupBy({
    by: ['eventType'],
    _count: {
      id: true
    },
    where: {
      createdAt: {
        gte: startDate
      }
    }
  });

  // Transform to a simpler object { ONLINE: 10, OFFLINE: 5, ... }
  const result = {
    ONLINE: 0,
    OFFLINE: 0,
    WARNING: 0,
    ACK: 0,
    TOTAL: 0
  };

  summary.forEach(item => {
    result[item.eventType] = item._count.id;
    result.TOTAL += item._count.id;
  });

  return result;
};

exports.getTopTroubleDevices = async (days = 1) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // ดึงข้อมูลสรุปเหตุการณ์แยกตามอุปกรณ์และประเภท
  const topEvents = await prisma.deviceEventLog.groupBy({
    by: ['deviceId', 'eventType'],
    where: {
      createdAt: { gte: startDate },
      eventType: { in: ['OFFLINE', 'WARNING', 'DOWN'] } // เน้นเฉพาะปัญหา
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 20 // ดึงมาเผื่อ Group ต่อใน Code
  });

  // ดึงชื่ออุปกรณ์มาประกอบ
  const deviceIds = [...new Set(topEvents.map(e => e.deviceId))];
  const devices = await prisma.managedDevice.findMany({
    where: { id: { in: deviceIds } },
    select: { id: true, name: true, currentIp: true }
  });

  // รวมข้อมูลเข้าด้วยกัน
  const result = devices.map(dev => {
    const devEvents = topEvents.filter(e => e.deviceId === dev.id);
    const offlineCount = devEvents.find(e => e.eventType === 'OFFLINE' || e.eventType === 'DOWN')?._count.id || 0;
    const warningCount = devEvents.find(e => e.eventType === 'WARNING')?._count.id || 0;
    
    return {
      ...dev,
      offlineCount,
      warningCount,
      totalIncidents: offlineCount + warningCount
    };
  }).sort((a, b) => b.totalIncidents - a.totalIncidents).slice(0, 5);

  return result;
};