// src/routes/logRoutes.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware'); 

// บังคับล็อคอินและจำกัดสิทธิ์ให้เฉพาะ Admin ขึ้นไป
router.use(verifyToken);
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.get('/', adminAccess, logController.getActivityLogs);
router.get('/event-summary', adminAccess, logController.getEventSummary);
router.get('/top-trouble-devices', adminAccess, logController.getTopTroubleDevices);

module.exports = router;