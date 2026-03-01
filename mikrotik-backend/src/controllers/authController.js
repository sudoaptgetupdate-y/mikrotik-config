const authService = require('../services/authService');

exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  
  // โยน Error แทนการใช้ res.status(400) Middleware จะจัดการแปลงเป็น 400 ให้
  if (!identifier || !password) throw new Error("BAD_REQUEST: Please provide username/email and password");

  const result = await authService.login(identifier, password);
  res.json({ message: "Login successful", ...result });
};

exports.logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // โยน Error ไปให้ Middleware จัดการ
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error("BAD_REQUEST: No token provided");

  const token = authHeader.split(' ')[1];
  await authService.logout(token);
  res.json({ message: "Logout successful" });
};