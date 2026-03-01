const prisma = require('../config/prisma');

exports.clearAckHistory = async (days, actionUserId) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

  const devices = await prisma.managedDevice.findMany({ where: { ackReason: { not: null } } });
  let updatedCount = 0;

  for (const device of devices) {
    let history = [];
    if (typeof device.ackReason === 'string') { try { history = JSON.parse(device.ackReason); } catch(e) {} } 
    else if (Array.isArray(device.ackReason)) { history = device.ackReason; }

    if (history.length > 0) {
       const filteredHistory = history.filter(h => new Date(h.timestamp) >= cutoffDate);
       if (filteredHistory.length !== history.length) {
          await prisma.managedDevice.update({ where: { id: device.id }, data: { ackReason: filteredHistory.length > 0 ? filteredHistory : null } });
          updatedCount++;
       }
    }
  }
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Cleared global acknowledge history older than ${days} days (Affected ${updatedCount} devices)` } });
  return updatedCount;
};

exports.clearEventHistory = async (days, actionUserId) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  const result = await prisma.deviceEventLog.deleteMany({ where: { createdAt: { lt: cutoffDate } } });
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Cleared device event history older than ${days} days (Deleted ${result.count} records)` } });
  return result.count;
};

exports.clearActivityLog = async (days, actionUserId) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  const result = await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoffDate } } });
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Cleared system activity logs older than ${days} days (Deleted ${result.count} records)` } });
  return result.count;
};