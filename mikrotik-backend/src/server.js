const app = require('./app');
const prisma = require('./config/prisma'); 
const logger = require('./utils/logger'); 
const telegramController = require('./controllers/telegramController');
const cronJobs = require('./services/cronJobs'); // 🚀 เพิ่มการนำเข้า Cron Jobs

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected'); 
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`); 
      
      // ✅ เริ่มการทำงานของ Cron Job สำหรับส่งรายงาน Telegram ประจำวัน (07:30)
      cronJobs.initDailyReportCron();
      
      // 🟢 เริ่มการทำงานของ Cron Job สำหรับตรวจจับอุปกรณ์ Offline ทุกๆ 1 นาที
      cronJobs.initRealtimeMonitorCron();
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error); 
    process.exit(1);
  }
}

startServer();