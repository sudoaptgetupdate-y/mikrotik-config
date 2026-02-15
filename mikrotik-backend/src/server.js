// src/server.js
const app = require('./app');
const prisma = require('./config/prisma'); // แยก prisma client ออกไป
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // เช็ค Database connection ก่อนเริ่ม
    await prisma.$connect();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();