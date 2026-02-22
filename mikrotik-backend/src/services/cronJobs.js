const cron = require('node-cron');
const prisma = require('../config/prisma');

// รันทุกๆ เที่ยงคืน (0 0 * * *)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log("🧹 Running Audit Log Cleanup...");
    
    // คำนวณวันที่ย้อนหลังไป 90 วัน
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // ลบ Log ที่เก่ากว่า 90 วันทิ้ง
    const deleted = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo, // lt = less than (เก่ากว่า)
        },
      },
    });

    console.log(`✅ Cleanup complete: Deleted ${deleted.count} old logs.`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
});

// ลบ Token ที่หมดอายุออกจากตาราง RevokedToken ทุกวันตอนเที่ยงคืน
cron.schedule('0 0 * * *', async () => {
  try {
    const deleted = await prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    console.log(`[Cron] Cleaned up ${deleted.count} expired tokens from blacklist.`);
  } catch (error) {
    console.error("[Cron] Failed to clean revoked tokens:", error.message);
  }
});