const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../middlewares/authMiddleware');

// 🛡️ สร้าง Limiter เฉพาะสำหรับ Login (ป้องกัน Brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // ให้โอกาสล็อกอินผิด/ถูกรวมกัน แค่ 5 ครั้งต่อ 15 นาที ต่อ 1 IP
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ เอา loginLimiter มาสกัดกั้นก่อนเข้า authController.login
router.post('/login', loginLimiter, authController.login);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;