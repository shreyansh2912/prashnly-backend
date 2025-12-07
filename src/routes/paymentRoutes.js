const express = require('express');
const router = express.Router();
const { createCheckoutSession, handleWebhook } = require('../controller/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Create checkout session (Protected)
router.post('/create-checkout-session', protect, createCheckoutSession);

// Webhook (Public, but signature verified)
// Note: The raw body parsing is handled in index.js or specifically for this route
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
