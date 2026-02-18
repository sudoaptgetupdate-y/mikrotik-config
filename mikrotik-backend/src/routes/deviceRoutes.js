const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateDevice } = require('../middlewares/authMiddleware');

// Group 1: สำหรับ Web Frontend (Admin/User ใช้งาน)
router.post('/', deviceController.createDevice);        // สร้าง Device
router.get('/user/:userId', deviceController.getUserDevices); // ดูรายการ Device
router.post('/:id/log-download', deviceController.logDownload);

// Group 2: สำหรับ MikroTik (Machine ใช้งาน)
// สังเกตว่าเราเอา authenticateDevice มาคั่นไว้เพื่อตรวจ Token ก่อน
router.post('/heartbeat', authenticateDevice, deviceController.handleHeartbeat);
router.put('/:id', deviceController.updateDevice);

module.exports = router;