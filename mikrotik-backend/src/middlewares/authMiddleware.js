const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma'); 
const { encrypt } = require('../utils/cryptoUtil'); // ✅ นำเข้าฟังก์ชัน encrypt ที่ถูกต้องตรงนี้

const JWT_SECRET = process.env.JWT_SECRET;

// 1. ฟังก์ชันตรวจ Token (หน้าเว็บ)
exports.verifyToken = async (req, res, next) => { // ✅ เติม async
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 🛡️ เช็คก่อนเลยว่า Token นี้ถูกแบน (Blacklist) ไปหรือยัง
    const isRevoked = await prisma.revokedToken.findFirst({
      where: { token: token }
    });

    if (isRevoked) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// 2. ฟังก์ชันตรวจสิทธิ์ (Role-Based Access Control)
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next(); 
  };
};

// 3. ฟังก์ชันตรวจ API Key สำหรับอุปกรณ์ MikroTik โดยเฉพาะ
exports.verifyDeviceToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing device token' });
  }

  const deviceToken = authHeader.split(' ')[1]; // Token ที่ MikroTik ส่งมา (Plaintext)
  const encryptedSearchToken = encrypt(deviceToken); // 🔒 เข้ารหัสก่อนเอาไปค้นหา

  try {
    const device = await prisma.managedDevice.findFirst({
      where: { 
        OR: [
          { apiToken: encryptedSearchToken }, // ค้นหาตัวที่เข้ารหัสแล้ว (ระบบใหม่)
          { apiToken: deviceToken }           // ค้นหาตัวที่ยังเป็น Plaintext (รองรับอุปกรณ์เดิมใน DB)
        ]
      }
    });

    if (!device) {
      return res.status(403).json({ error: 'Unauthorized device' });
    }

    req.device = device;
    next();
  } catch (error) {
    console.error("Device verification error:", error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};