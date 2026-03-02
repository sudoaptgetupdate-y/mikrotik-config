const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middlewares/validateMiddleware');
const { loginSchema } = require('../validations/schemas');

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

router.post('/refresh-token', authController.refreshToken); 

module.exports = router;