const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// ✅ นำเข้า Zod Validation
const validate = require('../middlewares/validateMiddleware');
const { createUserSchema } = require('../validations/schemas');

// บังคับล็อคอิน
router.use(verifyToken);

// =========================================================
// 🟢 โซนทั่วไป: ทุกคนสามารถเข้าถึงข้อมูลและอัปเดตโปรไฟล์ตัวเองได้
// =========================================================
router.get('/:id', userController.getUserById);   
router.put('/:id', userController.updateUser);    

// =========================================================
// 🔴 โซนผู้ดูแล: เฉพาะ Admin และ Super Admin ที่สามารถจัดการระบบ User ได้
// =========================================================
const adminAccess = requireRole(['SUPER_ADMIN', 'ADMIN']);

router.get('/', adminAccess, userController.getUsers);      

// 🛡️ ดักจับข้อมูลด้วย validate(createUserSchema) ก่อนเข้า Controller
router.post('/', adminAccess, validate(createUserSchema), userController.createUser);   

router.delete('/:id', adminAccess, userController.deleteUser); 

module.exports = router;