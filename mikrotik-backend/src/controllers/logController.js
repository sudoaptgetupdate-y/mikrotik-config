const prisma = require('../config/prisma');

exports.getActivityLogs = async (req, res) => {
  try {
    // 1. รับค่าจาก Query Parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // คำนวณจุดเริ่มต้นของการดึงข้อมูล
    const skip = (page - 1) * limit;

    // 2. สร้างเงื่อนไขการค้นหา (Where Clause)
    let whereClause = {};

    // ค้นหาจากข้อความ (Details หรือ ชื่อ User)
    if (search) {
      whereClause.OR = [
        { details: { contains: search } },
        { user: { username: { contains: search } } }
      ];
    }

    // กรองด้วยวันที่
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        // ให้ถึงสิ้นสุดของวันนั้น
        whereClause.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // 3. ดึงข้อมูล Log และนับจำนวนทั้งหมดไปพร้อมกัน
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

    // 4. ส่งข้อมูลกลับไปพร้อม Meta Data สำหรับทำ Pagination
    res.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Fetch logs failed:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};