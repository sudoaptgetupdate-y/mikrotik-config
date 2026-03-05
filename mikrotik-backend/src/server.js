const app = require('./app');
const prisma = require('./config/prisma'); 
const logger = require('./utils/logger'); // ✅ นำเข้า logger
const telegramController = require('./controllers/telegramController'); // ✅ นำเข้า telegramController เพื่อใช้ Cron Job

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected'); 
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`); 
      
      // ✅ เริ่มการทำงานของ Cron Job สำหรับส่งรายงาน Telegram ประจำวัน (07:30)
      telegramController.initDailyReportCron();
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error); 
    process.exit(1);
  }
}

startServer();