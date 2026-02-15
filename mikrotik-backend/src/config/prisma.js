const { PrismaClient } = require('@prisma/client');

// สร้าง instance เดียวเพื่อใช้ทั้งโปรเจกต์
const prisma = new PrismaClient();

module.exports = prisma;