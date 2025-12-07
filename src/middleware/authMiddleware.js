const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!token || token === 'null' || token === 'undefined') {
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }

            if (token.startsWith('pk_live_')) {
                req.user = await User.findOne({ apiKey: token }).select('-password');
            } else {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                req.user = await User.findById(decoded.id).select('-password');
            }

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error('Auth Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        ('No Bearer token found in headers');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
