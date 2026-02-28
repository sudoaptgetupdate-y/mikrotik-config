const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// นำเข้า Middleware 
const { verifyToken, requireRole, verifyDeviceToken } = require('../middlewares/authMiddleware');

// =========================================================
// 📡 โซนสำหรับ MikroTik (ใช้ API Key)
// =========================================================
router.post('/heartbeat', verifyDeviceToken, deviceController.handleHeartbeat);


// =========================================================
// 🔒 โซนสำหรับหน้าเว็บ (ต้องล็อกอินก่อนถึงจะทำคำสั่งด้านล่างได้)
// =========================================================
router.use(verifyToken);

// 🛠️ โซน Maintenance: อนุญาตเฉพาะ SUPER_ADMIN
// (ต้องวางไว้ตรงนี้ เพื่อให้ Express อ่านเจอก่อนไปเจอ /:id)
router.post('/maintenance/clear-ack', requireRole(['SUPER_ADMIN']), deviceController.clearAckHistory);
router.post('/maintenance/clear-events', requireRole(['SUPER_ADMIN']), deviceController.clearEventHistory);
router.post('/maintenance/clear-activity-logs', requireRole(['SUPER_ADMIN']), deviceController.clearActivityLog);

// 🟢 โซน Read-only: ทุกคน (รวมถึง Employee) ดูข้อมูลได้
router.get('/user/:userId', deviceController.getUserDevices);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/history', deviceController.getDeviceHistory);
router.get('/:id/events', deviceController.getDeviceEvents); // <== เพิ่ม Route ดูประวัติ

// 🔴 โซน Action: อนุญาตเฉพาะ SUPER_ADMIN และ ADMIN เท่านั้น
const writeAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.post('/', writeAccess, deviceController.createDevice);
router.put('/:id', writeAccess, deviceController.updateDevice);
router.delete('/:id', writeAccess, deviceController.deleteDevice);
router.put('/:id/restore', writeAccess, deviceController.restoreDevice);
router.post('/:id/acknowledge', writeAccess, deviceController.acknowledgeWarning);
router.post('/:id/log-download', writeAccess, deviceController.logDownload);

module.exports = router;