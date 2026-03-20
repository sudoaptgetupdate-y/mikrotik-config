const prisma = require('../config/prisma');

exports.checkDuplicate = async (name, excludeId = null) => {
  const where = { name: { equals: name } };
  if (excludeId) where.id = { not: parseInt(excludeId) };

  const existing = await prisma.deviceModel.findFirst({ where });
  return { exists: !!existing };
};

exports.getModels = async (isShowDeleted) => {
  return await prisma.deviceModel.findMany({
    where: { isActive: !isShowDeleted },
    include: { ports: true, _count: { select: { configs: true } } },
    orderBy: { id: 'desc' }
  });
};

exports.createModel = async (name, imageUrl, ports, actionUserId) => {
  if (!name || !ports || ports.length === 0) throw new Error("BAD_REQUEST: Model name and at least one port are required.");

  // 🎯 ตรวจสอบชื่อซ้ำ
  const isDuplicate = await prisma.deviceModel.findUnique({ where: { name } });
  if (isDuplicate) throw new Error("CONFLICT: ชื่อรุ่นอุปกรณ์นี้มีอยู่ในระบบแล้ว");

  const newModel = await prisma.deviceModel.create({
    data: { name, imageUrl: imageUrl || null, ports: { create: ports } },
    include: { ports: true }
  });
  
  await prisma.activityLog.create({
    data: { userId: actionUserId, action: "CREATE_DEVICE", details: `Created hardware model: ${name}` }
  });
  return newModel;
};

exports.deleteModel = async (id, actionUserId) => {
  const targetModel = await prisma.deviceModel.findUnique({ where: { id: parseInt(id) } });
  if (!targetModel) throw new Error("NOT_FOUND");

  const inUseCount = await prisma.config.count({ where: { deviceModelId: parseInt(id) } });
  
  if (inUseCount > 0) {
    await prisma.deviceModel.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    await prisma.activityLog.create({ data: { userId: actionUserId, action: "DELETE_DEVICE", details: `Soft deleted hardware model: ${targetModel.name}` } });
    return { message: "Model soft-deleted (hidden) successfully. Config history is preserved." };
  } else {
    await prisma.deviceModel.delete({ where: { id: parseInt(id) } });
    await prisma.activityLog.create({ data: { userId: actionUserId, action: "DELETE_DEVICE", details: `Permanently deleted hardware model: ${targetModel.name}` } });
    return { message: "Model permanently deleted." };
  }
};

exports.restoreModel = async (id, actionUserId) => {
  const updatedModel = await prisma.deviceModel.update({ where: { id: parseInt(id) }, data: { isActive: true } });
  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Restored hardware model: ${updatedModel.name}` } });
};

exports.updateModel = async (id, name, imageUrl, ports, actionUserId) => {
  if (!name || !ports || ports.length === 0) throw new Error("BAD_REQUEST: Model name and at least one port are required.");

  const modelId = parseInt(id);
  // 🎯 ตรวจสอบชื่อซ้ำ (ไม่รวมตัวเอง)
  const isDuplicate = await prisma.deviceModel.findFirst({ 
    where: { name, id: { not: modelId } } 
  });
  if (isDuplicate) throw new Error("CONFLICT: ชื่อรุ่นอุปกรณ์ใหม่ซ้ำกับรุ่นอื่นในระบบ");

  await prisma.portTemplate.deleteMany({ where: { deviceModelId: modelId } });
  const updatedModel = await prisma.deviceModel.update({
    where: { id: modelId },
    data: {
      name, imageUrl: imageUrl || null,
      ports: { create: ports.map(p => ({ name: p.name, type: p.type, defaultRole: p.defaultRole })) }
    },
    include: { ports: true }
  });

  await prisma.activityLog.create({ data: { userId: actionUserId, action: "UPDATE_DEVICE", details: `Updated hardware model: ${name}` } });
  return updatedModel;
};