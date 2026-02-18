const prisma = require('../config/prisma');

exports.getActivityLogs = async (req, res) => {
  try {
    // ดึงข้อมูล Log ล่าสุด 100 รายการ
    const logs = await prisma.activityLog.findMany({
      include: {
        user: { select: { username: true } } // ดึงชื่อ User มาด้วย
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error("Fetch logs failed:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};