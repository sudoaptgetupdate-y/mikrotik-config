const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

//บังคับให้ทุก Route ต้องล็อคอินก่อน
router.use(verifyToken);

// GET /api/master/models (อนุญาตให้ทุกคนที่ล็อคอินเข้ามาดูรายการ Model ได้)
router.get('/models', modelController.getModels);

//กำหนดสิทธิ์ให้เฉพาะ Admin และ Super Admin ที่สามารถเพิ่ม/ลบ/กู้คืนข้อมูลได้
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

//กำหนดสิทธิ์เฉพาะ Super Admin เท่านั้นที่แก้ไข (Edit) ได้
const superAdminAccess = requireRole(['SUPER_ADMIN']);

router.post('/models', adminAccess, modelController.createModel);
router.delete('/models/:id', adminAccess, modelController.deleteModel); 
router.put('/models/:id/restore', adminAccess, modelController.restoreModel);
router.put('/models/:id', superAdminAccess, modelController.updateModel);

module.exports = router;