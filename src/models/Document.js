const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    storagePath: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
    },
    shareToken: {
        type: String,
        unique: true,
        sparse: true, // Allows null/undefined to be non-unique
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'protected'],
        default: 'private',
    },
    protectionType: {
        type: String,
        enum: ['otp', 'password', 'none'],
        default: 'none',
    },
    passwordHash: {
        type: String,
        select: false, // Do not return by default
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    vectorIds: [String], // IDs of vectors in Supabase/Vector DB
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Document', documentSchema);
