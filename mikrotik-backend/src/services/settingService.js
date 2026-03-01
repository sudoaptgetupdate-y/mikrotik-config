const prisma = require('../config/prisma');

exports.getSettings = async (key) => {
  if (key) {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new Error("NOT_FOUND");
    return { ...setting, value: JSON.parse(setting.value) };
  }

  const settings = await prisma.systemSetting.findMany();
  return settings.map(s => ({ ...s, value: JSON.parse(s.value) }));
};

exports.updateSetting = async (key, value, description, actionUserId) => {
  if (key === 'MONITOR_IPS' && (!Array.isArray(value) || value.length < 5)) {
    throw new Error("BAD_REQUEST: Monitor IPs must contain at least 5 IP addresses for Failover system to work properly.");
  }

  const updatedSetting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(value), ...(description && { description }) },
    create: { key, value: JSON.stringify(value), description: description || `System configuration for ${key}` }
  });

  await prisma.activityLog.create({
    data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Updated global setting: ${key}` }
  });

  return { ...updatedSetting, value: JSON.parse(updatedSetting.value) };
};