const cron = require('node-cron');
const prisma = require('../config/prisma');

// ==========================================
// 1. Audit Log Cleanup (รันทุกๆ เที่ยงคืน)
// ==========================================
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

// ==========================================
// 2. Revoked Token Cleanup (รันทุกๆ เที่ยงคืน)
// ==========================================
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

// 🟢 ส่วนที่ 3 (Check Offline) ถูกย้ายไปจัดการใน controllers/telegramController.js แล้ว 
// เพื่อให้ทำงานร่วมกับระบบ Flap Detection (หน่วงเวลา 3 นาที) ได้อย่างมีประสิทธิภาพสูงสุด