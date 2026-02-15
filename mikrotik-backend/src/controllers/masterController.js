const prisma = require('../config/prisma');

// ดึงข้อมูลรุ่น Router ทั้งหมด (รวมถึงข้อมูล Port ด้วย)
exports.getDeviceModels = async (req, res) => {
  try {
    const models = await prisma.deviceModel.findMany({
      include: {
        ports: true // ดึงข้อมูล PortTemplate มาด้วย (ether1, sfp1, ...)
      },
      orderBy: {
        id: 'asc'
      }
    });
    res.json(models);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch device models" });
  }
};