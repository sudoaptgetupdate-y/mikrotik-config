const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ✅ นำเข้า Zod Validation
const validate = require('../middlewares/validateMiddleware');
const { createModelSchema } = require('../validations/schemas');

// บังคับให้ทุก Route ต้องล็อคอินก่อน
router.use(verifyToken);

router.get('/models', modelController.getModels);

const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);
const superAdminAccess = requireRole(['SUPER_ADMIN']);

// 🛡️ ดักจับข้อมูลด้วย validate(createModelSchema)
router.post('/models', adminAccess, validate(createModelSchema), modelController.createModel);
router.delete('/models/:id', adminAccess, modelController.deleteModel); 
router.put('/models/:id/restore', adminAccess, modelController.restoreModel);
router.put('/models/:id', superAdminAccess, modelController.updateModel);

module.exports = router;