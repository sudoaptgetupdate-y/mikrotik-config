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

// ==========================================
// 3. Check Offline Devices (รันทุกๆ 1 นาที)
// ==========================================
cron.schedule('* * * * *', async () => {
  try {
    // 1. คำนวณเวลาถอยหลังไป 3 นาที (ถ้าเกิน 3 นาทีถือว่า Offline)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // 2. ค้นหาอุปกรณ์ทั้งหมดที่ Active อยู่ และไม่ได้ส่งข้อมูลมาเกิน 3 นาทีแล้ว
    const offlineDevices = await prisma.managedDevice.findMany({
      where: {
        lastSeen: { lt: threeMinutesAgo },
        status: { not: 'DELETED' } // ละเว้นอุปกรณ์ที่ถูกลบทิ้งไปแล้ว
      },
      select: { id: true, name: true }
    });

    // 3. วนลูปตรวจสอบและบันทึก Log
    for (const device of offlineDevices) {
      // ค้นหา Event ล่าสุดของอุปกรณ์ตัวนี้
      const lastEvent = await prisma.deviceEventLog.findFirst({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' }
      });

      // 🌟 บันทึก OFFLINE ก็ต่อเมื่อ "ไม่เคยมี Log มาก่อน" หรือ "Log ล่าสุดไม่ใช่ OFFLINE" 
      // (เพื่อป้องกันการบันทึก OFFLINE ซ้ำๆ ทุกนาทีจนล้น Database)
      if (!lastEvent || lastEvent.eventType !== 'OFFLINE') {
        await prisma.deviceEventLog.create({
          data: {
            deviceId: device.id,
            eventType: 'OFFLINE',
            details: 'Device lost connection (ขาดการติดต่อเกิน 3 นาที)'
          }
        });
        console.log(`[Alert] Device ${device.name} is now OFFLINE`);
      }
    }
  } catch (error) {
    console.error("❌ Offline Check Cron failed:", error);
  }
});