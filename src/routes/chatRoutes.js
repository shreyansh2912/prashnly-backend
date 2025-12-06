const express = require('express');
const router = express.Router();
const { chat, getChatHistory } = require('../controller/chatController');
const { protect } = require('../middleware/authMiddleware');

// Optional middleware wrapper to allow public access if shareToken is present
const optionalProtect = async (req, res, next) => {
    const shareToken = req.body?.shareToken || req.query?.shareToken;

    console.log('OptionalProtect Check:', {
        body: req.body,
        query: req.query,
        shareToken: shareToken,
        headers: req.headers
    });

    if (shareToken) {
        console.log('Share token present, skipping auth');
        return next();
    }
    console.log('No share token, requiring auth');
    return protect(req, res, next);
};

router.post('/', optionalProtect, chat);
router.get('/:chatId', optionalProtect, getChatHistory);

module.exports = router;
