const express = require('express');
const router = express.Router();
const { getUsageStats } = require('../controller/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUsageStats);

module.exports = router;
