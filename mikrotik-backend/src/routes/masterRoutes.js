const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ✅ บังคับให้ทุก Route ต้องล็อคอินก่อน
router.use(verifyToken);

// GET /api/master/models (อนุญาตให้ทุกคนที่ล็อคอินเข้ามาดูรายการ Model ได้)
router.get('/models', masterController.getModels);

// ✅ กำหนดสิทธิ์ให้เฉพาะ Admin และ Super Admin ที่สามารถเพิ่ม/ลบ/กู้คืนข้อมูลได้
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.post('/models', adminAccess, masterController.createModel);
router.delete('/models/:id', adminAccess, masterController.deleteModel); 
router.put('/models/:id/restore', adminAccess, masterController.restoreModel);

module.exports = router;