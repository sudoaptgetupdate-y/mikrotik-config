const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
// สร้าง Secret สำหรับ Refresh Token (ถ้าไม่ได้ตั้งใน .env ให้เอา Secret เดิมมาต่อท้าย)
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh'; 
const DUMMY_HASH = bcrypt.hashSync('dummy_password_for_timing_attack', 10);

exports.login = async (identifier, password) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] }
  });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); 
    throw new Error("UNAUTHORIZED: Invalid username or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("UNAUTHORIZED: Invalid username or password");
  }

  // ✅ 1. สร้าง Access Token (อายุสั้นแค่ 15 นาที เพื่อความปลอดภัย)
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' } 
  );

  // ✅ 2. สร้าง Refresh Token (อายุยาว 7 วัน)
  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' } 
  );

  delete user.password;
  return { accessToken, refreshToken, user };
};

// ✅ 3. ฟังก์ชันสำหรับขอ Token ใหม่
exports.refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw new Error("UNAUTHORIZED: User not found");

    // ออก Access Token ใบใหม่ให้
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    return accessToken;
  } catch (error) {
    throw new Error("UNAUTHORIZED: Invalid or expired refresh token");
  }
};

exports.logout = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return;
    const expiresAt = new Date(decoded.exp * 1000);
    const existing = await prisma.revokedToken.findFirst({ where: { token } });
    if (!existing) {
      await prisma.revokedToken.create({ data: { token, expiresAt } });
    }
  } catch (err) {}
};