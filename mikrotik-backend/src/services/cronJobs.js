const cron = require('node-cron');
const prisma = require('../config/prisma');

// ==========================================
// 🛠 Helper: ฟังก์ชันดึงค่าจำนวนวันจาก SystemSetting
// ==========================================
const getRetentionDays = async (settingKey, defaultDays) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
    if (setting && setting.value) {
      return parseInt(setting.value, 10) || defaultDays;
    }
  } catch (error) {
    console.error(`⚠️ ไม่สามารถดึงค่า ${settingKey} ได้ ใช้ค่า Default (${defaultDays} วัน) แทน`);
  }
  return defaultDays;
};

// ==========================================
// 1. Audit Log Cleanup (รันทุกๆ เที่ยงคืน)
// ==========================================
cron.schedule('0 0 * * *', async () => {
  try {
    // 🟢 ดึงค่าจาก DB (ถ้าไม่มีให้ใช้ 90 วัน)
    const retainDays = await getRetentionDays('AUDIT_LOG_RETENTION_DAYS', 90);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - retainDays);

    const deleted = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: targetDate } },
    });

    console.log(`🧹 [Cron] ลบ Audit Logs ที่เก่ากว่า ${retainDays} วัน สำเร็จจำนวน ${deleted.count} รายการ`);
  } catch (error) {
    console.error("❌ Audit Log Cleanup failed:", error);
  }
});

// ==========================================
// 2. Device Event Log Cleanup (รันทุกๆ เที่ยงคืน)
// ==========================================
cron.schedule('0 0 * * *', async () => {
  try {
    // 🟢 ดึงค่าจาก DB (ถ้าไม่มีให้ใช้ 60 วัน)
    const retainDays = await getRetentionDays('EVENT_LOG_RETENTION_DAYS', 60);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - retainDays);

    const deleted = await prisma.deviceEventLog.deleteMany({
      where: { createdAt: { lt: targetDate } },
    });

    console.log(`🧹 [Cron] ลบ Event Logs ที่เก่ากว่า ${retainDays} วัน สำเร็จจำนวน ${deleted.count} รายการ`);
  } catch (error) {
    console.error("❌ Event Log Cleanup failed:", error);
  }
});

// ==========================================
// 3. Revoked Token Cleanup (รันทุกๆ เที่ยงคืน)
// ==========================================
// อันนี้เก็บไว้เหมือนเดิมได้เลยครับ เพราะลบตามเวลาหมดอายุของ Token จริงๆ ไม่ได้ Hardcode จำนวนวัน
cron.schedule('0 0 * * *', async () => {
  try {
    const deleted = await prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    console.log(`🧹 [Cron] Cleaned up ${deleted.count} expired tokens.`);
  } catch (error) {
    console.error("❌ Token Cleanup failed:", error.message);
  }
});