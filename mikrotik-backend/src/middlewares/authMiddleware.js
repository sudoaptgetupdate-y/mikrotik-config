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