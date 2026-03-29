const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');

exports.createActivityLog = async ({ userId, action, details, ipAddress }) => {
  try {
    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress
      }
    });

    // 📢 ส่งแจ้งเตือนผ่าน Telegram สำหรับ Audit Log ที่สำคัญ (ไม่ต้องรอให้เสร็จก็ได้)
    triggerAuditNotification(log).catch(err => console.error("Audit Notify Error:", err));

    return log;
  } catch (error) {
    console.error('Failed to create activity log:', error);
    // ไม่ throw error เพื่อไม่ให้ขัดจังหวะการทำงานหลักของระบบ
  }
};

const triggerAuditNotification = async (log) => {
  try {
    // กำหนดประเภท Action ที่จะให้แจ้งเตือน
    const notifyActions = [
      'LOGIN', 'LOGIN_FAIL', 'UPDATE_SETTING', 'CREATE_USER', 'DELETE_USER', 
      'CREATE_GROUP', 'DELETE_GROUP', 'UPDATE_GROUP', 'MANAGE_GROUP_DEVICES',
      'TOGGLE_USER_STATUS', 'CREATE_MODEL', 'DELETE_MODEL', 'UPDATE_MODEL'
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
    
    // กรณี LOGIN_FAIL และไม่เจอ User ในระบบ (อาจพิมพ์ username ผิด)
    if (log.action === 'LOGIN_FAIL' && !user) {
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
      UPDATE_MODEL: '✏️'
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