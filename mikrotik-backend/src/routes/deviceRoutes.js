const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateDevice } = require('../middlewares/authMiddleware');

// Group 1: สำหรับ Web Frontend (Admin/User ใช้งาน)
router.post('/', deviceController.createDevice);              // สร้าง Device
router.put('/:id', deviceController.updateDevice);            // อัปเดต Device (ตอนกด Save)
router.get('/user/:userId', deviceController.getUserDevices); // ดูรายการ Device ทั้งหมดของ User
router.get('/:id', deviceController.getDeviceById);           // 🟢 ดึงข้อมูล Device 1 ตัว (จำเป็นตอนกดปุ่ม Edit)
router.get('/:id/history', deviceController.getDeviceHistory); // 🟢 ดูประวัติ Config (History)
router.post('/:id/log-download', deviceController.logDownload); // บันทึก Log ตอนกดดาวน์โหลด

// Group 2: สำหรับ MikroTik (Machine ใช้งาน)
// สังเกตว่าเราเอา authenticateDevice มาคั่นไว้เพื่อตรวจ Token ก่อน
router.post('/heartbeat', authenticateDevice, deviceController.handleHeartbeat);

module.exports = router;