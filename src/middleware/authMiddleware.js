const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    console.log('Auth Middleware Headers:', req.headers.authorization);

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token extracted:', token);

            if (!token || token === 'null' || token === 'undefined') {
                console.log('Token is invalid (null/undefined string)');
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }

            if (token.startsWith('pk_live_')) {
                // API Key Authentication
                req.user = await User.findOne({ apiKey: token }).select('-password');
                console.log('API Key Auth, User found:', !!req.user);
            } else {
                // JWT Authentication
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                req.user = await User.findById(decoded.id).select('-password');
                console.log('JWT Auth, User found:', !!req.user);
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
        console.log('No Bearer token found in headers');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
