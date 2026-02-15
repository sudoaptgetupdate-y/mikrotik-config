const prisma = require('../config/prisma');

exports.authenticateDevice = async (req, res, next) => {
  try {
    // 1. รับ Token จาก Header หรือ Body
    const token = req.headers['x-api-token'] || req.body.token;

    if (!token) {
      return res.status(401).json({ error: "Missing API Token" });
    }

    // 2. ค้นหาใน DB
    const device = await prisma.managedDevice.findUnique({
      where: { apiToken: token }
    });

    if (!device) {
      return res.status(403).json({ error: "Invalid Token" });
    }

    // 3. ถ้าเจอ ให้แปะข้อมูล device ใส่ req เพื่อส่งไปให้ Controller ใช้ต่อ
    req.device = device;
    next();

  } catch (error) {
    console.error("Auth Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};