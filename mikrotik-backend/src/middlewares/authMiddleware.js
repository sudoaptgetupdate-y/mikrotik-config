const prisma = require('../config/prisma');

exports.authenticateDevice = async (req, res, next) => {
  try {
    let token = req.headers['x-api-token'] || req.body.token;

    // ✅ เพิ่ม: รองรับการส่งแบบ Authorization: Bearer <token> (มาตรฐานสากล)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]; // ดึงเฉพาะตัว Token หลังคำว่า Bearer
      }
    }

    // ถ้ายังหาไม่เจออีก ให้แจ้ง Error กลับไป
    if (!token) {
      // แถม Header ให้ตามมาตรฐาน HTTP เพื่อแก้ Error ของ Mikrotik ที่ฟ้องว่า should contain www-authenticate
      res.setHeader('WWW-Authenticate', 'Bearer realm="api"'); 
      return res.status(401).json({ error: "Missing API Token" });
    }

    // 2. ค้นหาใน DB
    const device = await prisma.managedDevice.findUnique({
      where: { apiToken: token }
    });

    if (!device) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="api"');
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