const prisma = require('../config/prisma');

// ดึงข้อมูลรุ่น Router ทั้งหมด
exports.getDeviceModels = async (req, res) => {
  try {
    const models = await prisma.deviceModel.findMany({
      include: {
        ports: true,
        // ✅ เพิ่มส่วนนี้เข้าไปครับ
        _count: {
          select: { configs: true } // นับจำนวน Config ที่ผูกกับ Model นี้
        }
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