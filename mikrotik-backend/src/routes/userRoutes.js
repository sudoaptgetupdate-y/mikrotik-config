const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// บังคับล็อคอิน
router.use(verifyToken);

// =========================================================
// 🟢 โซนทั่วไป: ทุกคนสามารถเข้าถึงข้อมูลและอัปเดตโปรไฟล์ตัวเองได้
// =========================================================
router.get('/:id', userController.getUserById);   // ดึงข้อมูลโปรไฟล์
router.put('/:id', userController.updateUser);    // อัปเดตข้อมูล/เปลี่ยนรหัสผ่าน


// =========================================================
// 🔴 โซนผู้ดูแล: เฉพาะ Admin และ Super Admin ที่สามารถจัดการระบบ User ได้
// =========================================================
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.get('/', adminAccess, userController.getUsers);      // ดูรายชื่อ User ทั้งหมด
router.post('/', adminAccess, userController.createUser);   // สร้าง User ใหม่
router.delete('/:id', adminAccess, userController.deleteUser); // ลบ User

module.exports = router;