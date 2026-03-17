const prisma = require('../config/prisma');

exports.createActivityLog = async ({ userId, action, details, ipAddress }) => {
  try {
    return await prisma.activityLog.create({
      data: {
        userId,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
    // ไม่ throw error เพื่อไม่ให้ขัดจังหวะการทำงานหลักของระบบ
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