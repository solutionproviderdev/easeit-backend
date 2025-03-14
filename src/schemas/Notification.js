const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true, // Optimized for fast retrieval per user
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['push', 'email', 'sms', 'in-app'],
            default: 'in-app',
        },
        status: {
            type: String,
            enum: ['unread', 'read', 'archived'],
            default: 'unread',
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // For storing extra data (links, attachments, etc.)
            default: {},
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Create an index to speed up fetching notifications for a user
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
