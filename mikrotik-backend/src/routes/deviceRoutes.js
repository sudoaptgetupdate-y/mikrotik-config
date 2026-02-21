const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// ✅ นำเข้า Middleware ใหม่ (verifyDeviceToken) มาด้วย
const { verifyToken, requireRole, verifyDeviceToken } = require('../middlewares/authMiddleware');

// =========================================================
// 📡 โซนสำหรับ MikroTik (ใช้ API Key)
// =========================================================

// ใช้ยาม verifyDeviceToken เพื่อตรวจ API Key แทนการตรวจ JWT ของ User
router.post('/heartbeat', verifyDeviceToken, deviceController.handleHeartbeat);


// =========================================================
// 🔒 โซนสำหรับหน้าเว็บ (ใช้ JWT Token)
// =========================================================
// บังคับว่าทุก Route ต่อจากบรรทัดนี้ ต้องล็อกอินหน้าเว็บก่อน
router.use(verifyToken);

// 🟢 โซน Read-only: ทุกคน (รวมถึง Employee) ดูข้อมูลได้
router.get('/user/:userId', deviceController.getUserDevices);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/history', deviceController.getDeviceHistory);

// 🔴 โซน Action: อนุญาตเฉพาะ SUPER_ADMIN และ ADMIN เท่านั้น
const writeAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.post('/', writeAccess, deviceController.createDevice);
router.put('/:id', writeAccess, deviceController.updateDevice);
router.delete('/:id', writeAccess, deviceController.deleteDevice);
router.put('/:id/restore', writeAccess, deviceController.restoreDevice);
router.post('/:id/acknowledge', writeAccess, deviceController.acknowledgeWarning);
router.post('/:id/log-download', writeAccess, deviceController.logDownload);

module.exports = router;