const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const JWT_SECRET = process.env.JWT_SECRET;

// 🛡️ แก้ไข 2.3: สร้าง Dummy Hash ไว้ล่วงหน้า (ใช้เวลาคำนวณเท่ากับการเช็ค Hash จริง)
const DUMMY_HASH = bcrypt.hashSync('dummy_password_for_timing_attack', 10);

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Please provide username/email and password" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    let isMatch = false;
    
    // 🛡️ แก้ไข 2.3: ป้องกัน Timing Attack
    if (!user) {
      // แม้ไม่เจอ User ก็สั่งให้โปรแกรมทำการเปรียบเทียบรหัสผ่าน (ถ่วงเวลาให้เท่ากับเจอ User)
      await bcrypt.compare(password, DUMMY_HASH); 
      return res.status(401).json({ error: "Invalid username or password" });
    } else {
      isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' } 
    );

    delete user.password;

    res.json({ message: "Login successful", token, user });

  } catch (error) {
    // 🛡️ แก้ไข 2.2: บันทึกเฉพาะข้อความ Error ไม่ส่ง Object ก้อนใหญ่ลง Log 
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: "No token provided" });
    }

    const token = authHeader.split(' ')[1];
    
    // ถอดรหัส Token เพื่อเอาเวลาหมดอายุ (exp) มาบันทึก
    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ error: "Invalid token format" });

    const expiresAt = new Date(decoded.exp * 1000);

    // เช็คว่าเคยมีใน Blacklist หรือยัง ถ้ายังให้บันทึกลงไป
    const existing = await prisma.revokedToken.findFirst({ where: { token } });
    if (!existing) {
      await prisma.revokedToken.create({
        data: { token, expiresAt }
      });
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({ error: "Failed to logout" });
  }
};