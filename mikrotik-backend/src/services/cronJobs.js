const cron = require('node-cron');
const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');

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
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // ค้นหาอุปกรณ์ (✅ สั่ง include groups มาด้วย เพื่อเอาข้อมูลกลุ่มและผู้ดูแล)
    const offlineDevices = await prisma.managedDevice.findMany({
      where: {
        lastSeen: { lt: threeMinutesAgo },
        status: { not: 'DELETED' }
      },
      include: { groups: true } 
    });

    for (const device of offlineDevices) {
      const lastEvent = await prisma.deviceEventLog.findFirst({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' }
      });

      // ถ้าบันทึกสถานะล่าสุดยังไม่ใช่ OFFLINE (แปลว่าเพิ่ง Offline ครั้งแรก)
      if (!lastEvent || lastEvent.eventType !== 'OFFLINE') {
        
        // 1. บันทึกลง Log ในฐานข้อมูล
        await prisma.deviceEventLog.create({
          data: { deviceId: device.id, eventType: 'OFFLINE', details: 'Device lost connection (ขาดการติดต่อเกิน 3 นาที)' }
        });

        // 2. 🌟 แจ้งเตือนผ่าน Telegram (พร้อมแนบข้อมูลผู้ดูแลกลุ่ม)
        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            
            // ตรวจสอบว่ามีข้อมูลผู้ดูแลหรือไม่ ถ้ามีให้สร้างข้อความต่อท้าย
            const adminInfo = (group.adminName || group.adminContact) 
              ? `\n\n👨‍🔧 <b>ผู้รับผิดชอบดูแล:</b> ${group.adminName || '-'}\n📞 <b>ติดต่อ:</b> ${group.adminContact || '-'}` 
              : '';
            
            // ประกอบร่างข้อความ (Template)
            const msg = `🚨 <b>[DEVICE OFFLINE] - ขาดการติดต่อ</b>\n\n🖥 <b>อุปกรณ์:</b> <code>${device.name}</code>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n⚠️ <b>สถานะ:</b> ไม่สามารถเชื่อมต่อได้เกิน 3 นาที (อาจเกิดจากไฟดับหรืออินเทอร์เน็ตหลุด)${adminInfo}`;
            
            // เช็คว่ากลุ่มนี้เปิดแจ้งเตือนไว้ และใส่ Token/ChatID ครบถ้วน ถึงจะส่งข้อความ
            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
            }
          }
        }
        
        console.log(`[Alert] Device ${device.name} is now OFFLINE`);
      }
    }
  } catch (error) {
    console.error("❌ Offline Check Cron failed:", error);
  }
});