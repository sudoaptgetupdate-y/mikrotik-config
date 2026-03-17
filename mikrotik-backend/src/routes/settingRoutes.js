// src/routes/settingRoutes.js
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ทุก Route ในนี้ต้อง Login ก่อน
router.use(verifyToken);

// GET /api/settings - ดึงข้อมูลทั้งหมด (อนุญาตทุก Role เพื่อให้การคำนวณ Thresholds ตรงกัน)
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE']), settingController.getSettings);

// 🟢 เพิ่ม Route ใหม่ สำหรับทดสอบ AI (เฉพาะ SUPER_ADMIN)
router.post('/test-ai', requireRole(['SUPER_ADMIN']), settingController.testAIConnection);

// 🟢 เพิ่ม Route ใหม่ สำหรับรับข้อมูลจากหน้า Auto Cleanup (เฉพาะ SUPER_ADMIN)
router.post('/update', requireRole(['SUPER_ADMIN']), settingController.upsertSetting);

// PUT /api/settings/:key - อัปเดตข้อมูลตาม Key (เฉพาะ SUPER_ADMIN)
router.put('/:key', requireRole(['SUPER_ADMIN']), settingController.updateSetting);

module.exports = router;