const express = require('express');
const router = express.Router();
const { register, login, generateApiKey, getMe } = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/generate-key', protect, generateApiKey);
router.get('/me', protect, getMe);

module.exports = router;
