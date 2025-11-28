const express = require('express');
const router = express.Router();
const { chat } = require('../controller/chatController');
const { protect } = require('../middleware/authMiddleware');

// Optional middleware wrapper to allow public access if shareToken is present
const optionalProtect = async (req, res, next) => {
    if (req.body.shareToken) {
        return next();
    }
    return protect(req, res, next);
};

router.post('/', optionalProtect, chat);

module.exports = router;
