const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// GET /api/master/models
router.get('/models', masterController.getDeviceModels);

module.exports = router;