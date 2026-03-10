const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken, requireRole, verifyDeviceToken } = require('../middlewares/authMiddleware');

// ✅ นำเข้า Zod Validation
const validate = require('../middlewares/validateMiddleware');
const { createDeviceSchema } = require('../validations/schemas');

// =========================================================
// 📡 โซนสำหรับ MikroTik (ใช้ API Key)
// =========================================================
router.post('/heartbeat', verifyDeviceToken, deviceController.handleHeartbeat);

// =========================================================
// 🔒 โซนสำหรับหน้าเว็บ (ต้องล็อกอินก่อนถึงจะทำคำสั่งด้านล่างได้)
// =========================================================
router.use(verifyToken);

// 🛠️ โซน Maintenance: อนุญาตเฉพาะ SUPER_ADMIN
router.post('/maintenance/clear-ack', requireRole(['SUPER_ADMIN']), deviceController.clearAckHistory);
router.post('/maintenance/clear-events', requireRole(['SUPER_ADMIN']), deviceController.clearEventHistory);
router.post('/maintenance/clear-activity-logs', requireRole(['SUPER_ADMIN']), deviceController.clearActivityLog);

// 🟢 โซน Read-only: ทุกคน (รวมถึง Employee) ดูข้อมูลได้
router.get('/user/:userId', deviceController.getUserDevices);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/history', deviceController.getDeviceHistory);
router.get('/:id/events', deviceController.getDeviceEvents);

// 🔴 โซน Action: อนุญาตเฉพาะ SUPER_ADMIN และ ADMIN เท่านั้น
const writeAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

// 🛡️ ดักจับข้อมูลด้วย validate(createDeviceSchema)
router.post('/', writeAccess, validate(createDeviceSchema), deviceController.createDevice);
router.put('/:id', writeAccess, deviceController.updateDevice);
router.delete('/:id', writeAccess, deviceController.deleteDevice);
router.put('/:id/restore', writeAccess, deviceController.restoreDevice);
router.delete('/:id/hard', writeAccess, deviceController.hardDeleteDevice);
router.post('/:id/acknowledge', writeAccess, deviceController.acknowledgeWarning);
router.delete('/:id/hard', writeAccess, deviceController.hardDeleteDevice);

// ✅ เติมบรรทัดนี้กลับเข้ามา! (Route สำหรับดาวน์โหลด Log)
router.post('/:id/log-download', writeAccess, deviceController.logDownload);

module.exports = router;