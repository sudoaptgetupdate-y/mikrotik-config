const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// 1. ฟังก์ชันตรวจ Token (ล็อคไม่ให้คนนอกเข้า)
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // ถอดรหัส Token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // จะได้ { id, username, role, ... } แปะไปกับ Request
    next(); // ผ่านด่านไปทำงานต่อได้
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// 2. ฟังก์ชันตรวจสิทธิ์ (Role-Based Access Control)
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // ถ้า User ไม่มี Role หรือ Role ไม่ตรงกับที่กำหนดไว้ใน Array
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next(); // สิทธิ์ถึง ผ่านได้!
  };
};

//3. ฟังก์ชันตรวจ API Key สำหรับอุปกรณ์ MikroTik โดยเฉพาะ
const prisma = require('../config/prisma'); // ต้อง import prisma มาใช้

exports.verifyDeviceToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing device token' });
  }

  const deviceToken = authHeader.split(' ')[1];

  try {
    // หาอุปกรณ์ใน Database ที่มี API Token ตรงกับที่ส่งมา
    const device = await prisma.managedDevice.findFirst({
      where: { apiToken: deviceToken }
    });

    if (!device) {
      return res.status(403).json({ error: 'Unauthorized device' });
    }

    // แปะข้อมูล device ใส่ req เพื่อให้ Controller เอาไปใช้ต่อได้ (req.device)
    req.device = device;
    next();
  } catch (error) {
    console.error("Device verification error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};