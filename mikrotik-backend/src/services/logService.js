const prisma = require('../config/prisma');

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