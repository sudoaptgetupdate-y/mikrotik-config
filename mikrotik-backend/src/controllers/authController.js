const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger'); // (ใช้ logger จากข้อ 3)
const JWT_SECRET = process.env.JWT_SECRET;

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

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // ✅ ปรับลดอายุ Token จาก '1d' เป็น '1h' (1 ชั่วโมง) หรือ '2h' (2 ชั่วโมง)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' } // หากหมดอายุ User จะต้องล็อคอินใหม่
    );

    delete user.password;

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: "Server error during login" });
  }
};