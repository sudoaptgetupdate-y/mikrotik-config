const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 1. นำเข้า Middleware และ Schema ที่เราสร้างไว้
const validate = require('../middlewares/validateMiddleware');
const { loginSchema } = require('../validations/schemas');

// 2. เอา validate(loginSchema) มาคั่นกลางก่อนจะเรียก authController.login
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

module.exports = router;