const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// ✅ นำเข้า Middleware
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// บังคับว่า "ทุก Route ในนี้ต้องมี Token ล็อกอินก่อนถึงจะทำได้"
router.use(verifyToken);

// 🟢 โซน Read-only: ทุกคน (รวมถึง Employee) ดูข้อมูลได้
router.get('/user/:userId', deviceController.getUserDevices);
router.get('/:id', deviceController.getDeviceById);
router.get('/:id/history', deviceController.getDeviceHistory);

// 🔴 โซน Action: อนุญาตเฉพาะ SUPER_ADMIN และ ADMIN เท่านั้น
// ถ้า Employee ยิง Postman เข้ามาตรงนี้ จะโดนเตะออก 403 ทันที!
const writeAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.post('/', writeAccess, deviceController.createDevice);
router.put('/:id', writeAccess, deviceController.updateDevice);
router.delete('/:id', writeAccess, deviceController.deleteDevice);
router.put('/:id/restore', writeAccess, deviceController.restoreDevice);
router.post('/:id/acknowledge', writeAccess, deviceController.acknowledgeWarning);
router.post('/:id/log-download', writeAccess, deviceController.logDownload);

module.exports = router;