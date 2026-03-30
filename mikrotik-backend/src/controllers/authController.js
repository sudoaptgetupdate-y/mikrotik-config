const authService = require('../services/authService');
const logService = require('../services/logService');
const prisma = require('../config/prisma');

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw new Error("BAD_REQUEST: Please provide username/email and password");

  try {
    const result = await authService.login(identifier, password);
    
    // ✅ บันทึก Audit Log เมื่อ Login สำเร็จ
    await logService.createActivityLog({
      userId: result.user.id,
      action: 'LOGIN',
      details: `User logged in: ${result.user.username} (IP: ${req.ip})`,
      ipAddress: req.ip
    });

    // ✅ ฝัง Refresh Token ลงใน HTTP-Only Cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, // JavaScript ของฝั่ง Frontend จะอ่านคุกกี้นี้ไม่ได้ (กันโดนแฮก)
      secure: process.env.NODE_ENV === 'production', // ถ้าขึ้น Server จริงให้ใช้ HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 วัน
    });

    res.json({ message: "Login successful", token: result.accessToken, user: result.user });
  } catch (error) {
    // 🛑 บันทึก Audit Log เมื่อ Login ล้มเหลว
    try {
      // พยายามหา User ว่าเป็นใคร (ถ้ามีในระบบ) เพื่อเก็บประวัติ
      const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] }
      });

      await logService.createActivityLog({
        userId: user ? user.id : 1, // ถ้าไม่เจอ user ให้ใช้ id: 1 (มักเป็น System/Admin ตัวแรก) เพื่อให้ผ่าน Relation check
        action: 'LOGIN_FAIL',
        details: `Login failed for: ${identifier} (IP: ${req.ip}) - Reason: ${error.message}`,
        ipAddress: req.ip,
        userNameOverride: user ? null : 'Guest / Unknown User'
      });
    } catch (logError) {
      console.error("Failed to log LOGIN_FAIL:", logError.message);
    }

    throw error; // ส่ง Error ต่อไปให้ global error handler จัดการส่ง Response
  }
};

// ✅ Controller สำหรับรับคำขอ Token ใบใหม่
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new Error("UNAUTHORIZED: No refresh token in cookie");

  const newAccessToken = await authService.refreshAccessToken(refreshToken);
  res.json({ token: newAccessToken });
};

exports.logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    await authService.logout(token);
  }
  
  // ✅ เคลียร์คุกกี้ทิ้งตอน Logout
  res.clearCookie('refreshToken');
  res.json({ message: "Logout successful" });
};