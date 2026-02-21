const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ✅ นำเข้า Middleware
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// บังคับล็อคอิน
router.use(verifyToken);

// เฉพาะ Admin และ Super Admin ที่สามารถจัดการระบบ User ได้
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.post('/', adminAccess, userController.createUser);
router.get('/', adminAccess, userController.getUsers);
router.put('/:id', adminAccess, userController.updateUser);
router.delete('/:id', adminAccess, userController.deleteUser);

module.exports = router;