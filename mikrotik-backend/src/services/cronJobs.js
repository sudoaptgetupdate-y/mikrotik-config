const cron = require('node-cron');
const prisma = require('../config/prisma');
const { sendTelegramAlert } = require('../utils/telegramUtil');
const { getAlertThresholds, generateGroupReportText } = require('../utils/telegramFormatter');

// 🆕 เพิ่ม Daily Report Cron
exports.initDailyReportCron = () => {
  cron.schedule('30 7 * * *', async () => {
    try {
      const groups = await prisma.deviceGroup.findMany({
        where: { isNotifyEnabled: true, telegramBotToken: { not: null }, telegramChatId: { not: null } },
        include: { devices: { where: { status: { not: 'DELETED' } } } }
      });
      if (groups.length > 0) {
        const thresholds = await getAlertThresholds();
        for (const group of groups) {
          if (group.devices && group.devices.length > 0) {
            const msg = generateGroupReportText(group, true, thresholds);
            await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg);
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
    } catch (error) { console.error("❌ [CRON] Daily Report Error:", error); }
  }, { scheduled: true, timezone: "Asia/Bangkok" });
};

// 🆕 เพิ่ม Real-time Monitor Cron (Offline Alert)
exports.initRealtimeMonitorCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000);
      const deadDevices = await prisma.managedDevice.findMany({
        where: { 
          status: { not: 'DELETED' }, 
          lastSeen: { not: null, lt: threeMinsAgo }, 
          isOfflineAlerted: false 
        },
        include: { groups: true }
      });
      for (const device of deadDevices) {
        let alertMsgIds = device.lastAlertMessageIds ? (typeof device.lastAlertMessageIds === 'string' ? JSON.parse(device.lastAlertMessageIds) : device.lastAlertMessageIds) : {};
        await prisma.deviceEventLog.create({ data: { deviceId: device.id, eventType: 'OFFLINE', details: 'Device went offline (No heartbeat for > 3 mins)' } });
        if (device.groups && device.groups.length > 0) {
          for (const group of device.groups) {
            if (group.isNotifyEnabled && group.telegramBotToken && group.telegramChatId) {
              const adminInfo = (group.adminName || group.adminContact) ? `\n\n👨‍🔧 <b><u>ผู้รับผิดชอบดูแล</u></b>\n👤 ชื่อ: ${group.adminName || '-'}\n📞 ติดต่อ: ${group.adminContact || '-'}` : '';
              let msg = `🛑 <b><u>[ DEVICE OFFLINE ]</u></b>\n━━━━━━━━━━━━━━━━━━\n🖥 <b>ชื่อ:</b> <b>${device.name}</b>\n✨ <b>วงจร:</b> <code>${device.circuitId || '-'}</code>\n🏷️ <b>รุ่น:</b> <code>${device.boardName || '-'}</code>\n📊 <b>สถานะ:</b> 🛑 <b><code>[ OFFLINE ]</code></b>\n⏳ <b>ขาดการติดต่อ:</b> <code>${new Date(device.lastSeen).toLocaleDateString('th-TH')} ${new Date(device.lastSeen).toLocaleTimeString('th-TH')}</code>${adminInfo}\n\n━━━━━━━━━━━━━━━━━━\n🌐 <b>จัดการ:</b> <a href="https://mikrotik.ntnakhon.com">คลิกเพื่อตรวจสอบ</a>`;
              const keyboard = [[{ text: "✅ รับทราบปัญหา", callback_data: `/ack _id_${device.id}` }]];
              const msgId = await sendTelegramAlert(group.telegramBotToken, group.telegramChatId, msg, { inline_keyboard: keyboard });
              if (msgId) alertMsgIds[group.telegramChatId] = msgId;
            }
          }
        }
        await prisma.managedDevice.update({ where: { id: device.id }, data: { isOfflineAlerted: true, isAcknowledged: false, lastAlertMessageIds: alertMsgIds } });
      }
    } catch (error) { console.error("❌ Offline Monitor Cron Error:", error); }
  });
};

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