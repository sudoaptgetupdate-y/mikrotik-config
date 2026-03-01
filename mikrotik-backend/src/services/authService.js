const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
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

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' } 
  );

  delete user.password;
  return { token, user };
};

exports.logout = async (token) => {
  const decoded = jwt.decode(token);
  if (!decoded) throw new Error("BAD_REQUEST: Invalid token format");

  const expiresAt = new Date(decoded.exp * 1000);
  const existing = await prisma.revokedToken.findFirst({ where: { token } });
  
  if (!existing) {
    await prisma.revokedToken.create({ data: { token, expiresAt } });
  }
};