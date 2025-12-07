const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    apiKey: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    plan: {
        type: String,
        enum: ['basic', 'premium', 'enterprise'],
        default: 'basic',
    },
    tokensUsed: {
        type: Number,
        default: 0,
    },
    maxTokens: {
        type: Number,
        default: 5000, // Default limit for basic plan
    },
    stripeCustomerId: {
        type: String,
    },
    subscriptionId: {
        type: String,
    },
});

module.exports = mongoose.model('User', userSchema);
