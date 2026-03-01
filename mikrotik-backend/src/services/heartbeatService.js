const prisma = require('../config/prisma');
const { decrypt } = require('../utils/cryptoUtil');

exports.processHeartbeat = async (token, payload, remoteIp) => {
  const { cpu, ram, storage, temp, latency, uptime, version } = payload;
  let matchedDeviceId = null;
  let device = null;

  const tokenParts = token.split('-');
  if (tokenParts.length > 1 && !isNaN(parseInt(tokenParts[0]))) {
    const potentialId = parseInt(tokenParts[0]);
    const actualToken = tokenParts.slice(1).join('-'); 
    device = await prisma.managedDevice.findUnique({ where: { id: potentialId } });
    if (device) {
      let isMatch = false;
      if (device.apiToken === actualToken) { isMatch = true; } 
      else { try { if (decrypt(device.apiToken) === actualToken) isMatch = true; } catch(err) {} }
      if (isMatch) matchedDeviceId = device.id;
    }
  }

  if (!matchedDeviceId) {
    const allDevices = await prisma.managedDevice.findMany({ select: { id: true, apiToken: true } });
    for (const d of allDevices) {
      if (d.apiToken === token) { matchedDeviceId = d.id; break; }
      try { if (decrypt(d.apiToken) === token) { matchedDeviceId = d.id; break; } } catch (err) {}
    }
    if (!matchedDeviceId) throw new Error("NOT_FOUND");
    device = await prisma.managedDevice.findUnique({ where: { id: matchedDeviceId } });
  }

  const isHighLoad = (cpu && parseInt(cpu) > 85) || (ram && parseInt(ram) > 85);
  const wasHighLoad = (device.cpuLoad && parseInt(device.cpuLoad) > 85) || (device.memoryUsage && parseInt(device.memoryUsage) > 85);
  
  let justCameOnline = false;
  if (device.lastSeen) {
    const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
    if (diffMinutes > 3) {
      justCameOnline = true;
      await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'ONLINE', details: 'Device is back online' } });
    }
  }

  if (isHighLoad && !wasHighLoad) await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'WARNING', details: `High Load Detected - CPU: ${cpu}%, RAM: ${ram}%` } });
  if (!isHighLoad && wasHighLoad && !justCameOnline) await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'ONLINE', details: 'System load is back to normal' } });

  let resetAckData = {};
  if (!isHighLoad) resetAckData = { isAcknowledged: false, ackByUserId: null, ackAt: null };

  await prisma.managedDevice.update({
    where: { id: device.id },
    data: {
      lastSeen: new Date(), currentIp: remoteIp, cpuLoad: cpu ? parseInt(cpu) : device.cpuLoad, 
      memoryUsage: ram ? parseInt(ram) : device.memoryUsage, storage: storage ? parseInt(storage) : device.storage, 
      temp: temp || device.temp, uptime: uptime || device.uptime, version: version || device.version, 
      latency: latency || device.latency, ...resetAckData
    }
  });
};