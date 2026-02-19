const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// GET /api/master/models
router.get('/models', masterController.getModels);
router.post('/models', masterController.createModel);
router.delete('/models/:id', masterController.deleteModel); 

// ✅ เพิ่ม Route สำหรับการกู้คืน (Restore)
router.put('/models/:id/restore', masterController.restoreModel);

module.exports = router;