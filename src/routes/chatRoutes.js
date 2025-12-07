const express = require('express');
const router = express.Router();
const { chat, getChatHistory, getAllChats } = require('../controller/chatController');
const { protect } = require('../middleware/authMiddleware');

const jwt = require('jsonwebtoken');

// Optional middleware wrapper to allow public access if shareToken is present OR valid guest token
const optionalProtect = async (req, res, next) => {
    const shareToken = req.body?.shareToken || req.query?.shareToken;
    const authHeader = req.headers.authorization;

    console.log('OptionalProtect Check:', {
        shareToken,
        authHeader
    });

    // 1. Check for Guest Token (Password Protected Access)
    if (authHeader && authHeader.startsWith('Bearer')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded.role === 'guest') {
                req.user = { id: 'guest', role: 'guest' }; // Mock user for guest
                return next();
            }
        } catch (err) {
        }
    }

    // 2. Check for Share Token (Public Access)
    if (shareToken) {
        return next();
    }

    // 3. Fallback to Standard Auth
    return protect(req, res, next);
};

router.post('/', optionalProtect, chat);
router.get('/', protect, getAllChats);
router.get('/:chatId', optionalProtect, getChatHistory);

module.exports = router;
