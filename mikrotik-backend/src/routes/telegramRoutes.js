const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');

// URL สำหรับรับ Webhook จาก Telegram
router.post('/webhook', telegramController.handleWebhook);

module.exports = router;