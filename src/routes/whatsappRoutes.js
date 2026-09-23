const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Webhook endpoint to receive messages from GreenAPI/UltraMsg
router.post('/webhook', whatsappController.receiveMessage);

module.exports = router;
