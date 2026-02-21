const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier รับได้ทั้ง email และ username

    if (!identifier || !password) {
      return res.status(400).json({ error: "Please provide username/email and password" });
    }

    // 1. ค้นหา User จาก Email หรือ Username ก็ได้
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // 2. ตรวจสอบรหัสผ่านที่ถูก Hash ไว้
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // 3. สร้าง JWT Token (แนบ id, username, role เข้าไปในเหรียญ)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' } // Token หมดอายุใน 1 วัน
    );

    // 4. ลบรหัสผ่านออกจาก object ก่อนส่งกลับให้ Frontend
    delete user.password;

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};