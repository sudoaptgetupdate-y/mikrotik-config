// src/routes/settingRoutes.js
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ทุก Route ในนี้ต้อง Login และเป็น SUPER_ADMIN เท่านั้น
router.use(verifyToken);
router.use(requireRole(['SUPER_ADMIN']));

// GET /api/settings - ดึงข้อมูลทั้งหมด
router.get('/', settingController.getSettings);

// 🟢 เพิ่ม Route ใหม่ สำหรับรับข้อมูลจากหน้า Auto Cleanup
router.post('/update', settingController.upsertSetting);

// PUT /api/settings/:key - อัปเดตข้อมูลตาม Key (เช่น PUT /api/settings/MONITOR_IPS)
router.put('/:key', settingController.updateSetting);

module.exports = router;