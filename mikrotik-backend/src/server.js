const app = require('./app');
const prisma = require('./config/prisma'); 
const logger = require('./utils/logger'); // ✅ นำเข้า logger
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected'); // ✅ เปลี่ยนจาก console.log
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`); // ✅ เปลี่ยนจาก console.log
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error); // ✅ เปลี่ยนจาก console.error
    process.exit(1);
  }
}

startServer();