const authService = require('../services/authService');

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) throw new Error("BAD_REQUEST: Please provide username/email and password");

  const result = await authService.login(identifier, password);
  
  // ✅ ฝัง Refresh Token ลงใน HTTP-Only Cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true, // JavaScript ของฝั่ง Frontend จะอ่านคุกกี้นี้ไม่ได้ (กันโดนแฮก)
    secure: process.env.NODE_ENV === 'production', // ถ้าขึ้น Server จริงให้ใช้ HTTPS
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 วัน
  });

  res.json({ message: "Login successful", token: result.accessToken, user: result.user });
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