const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// GET /api/master/models
router.get('/models', masterController.getModels);
router.post('/models', masterController.createModel);
router.delete('/models/:id', masterController.deleteModel); 

module.exports = router;