const mongoose = require('mongoose');

const { Schema } = mongoose;

const whatsAppAccountSchema = new Schema(
    {
        // Account identification
        accountId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        accountName: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },

        // WhatsApp connection details
        phoneNumber: {
            type: String,
            sparse: true, // Allow null until connected
            index: true,
        },
        jid: {
            type: String,
            sparse: true, // WhatsApp JID (e.g., "1234567890@s.whatsapp.net")
            index: true,
        },

        // Connection status
        status: {
            type: String,
            enum: ['disconnected', 'connecting', 'connected', 'qr_pending', 'error'],
            default: 'disconnected',
            index: true,
        },
        lastConnected: {
            type: Date,
        },
        lastDisconnected: {
            type: Date,
        },

        // Authentication state (stored in MongoDB instead of files)
        authState: {
            creds: {
                type: Schema.Types.Mixed, // Store Baileys credentials
            },
            keys: {
                type: Schema.Types.Mixed, // Store Baileys keys
            },
        },

        // QR Code data for pairing
        currentQR: {
            type: String,
            default: null,
        },
        qrExpiry: {
            type: Date,
            default: null,
        },

        // Account settings
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        autoReconnect: {
            type: Boolean,
            default: true,
        },

        // Business settings
        businessProfile: {
            name: String,
            category: String,
            description: String,
            website: String,
            email: String,
        },

        // Message handling preferences
        messageSettings: {
            autoReply: {
                enabled: { type: Boolean, default: false },
                message: { type: String, default: '' },
            },
            businessHours: {
                enabled: { type: Boolean, default: false },
                timezone: { type: String, default: 'UTC' },
                schedule: [
                    {
                        day: {
                            type: String,
                            enum: [
                                'monday',
                                'tuesday',
                                'wednesday',
                                'thursday',
                                'friday',
                                'saturday',
                                'sunday',
                            ],
                        },
                        startTime: String, // "09:00"
                        endTime: String, // "17:00"
                    },
                ],
            },
        },

        // Statistics
        stats: {
            totalMessagesSent: { type: Number, default: 0 },
            totalMessagesReceived: { type: Number, default: 0 },
            totalLeadsGenerated: { type: Number, default: 0 },
            lastMessageTime: Date,
        },

        // Associated users/departments
        assignedUsers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        assignedDepartments: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Department',
            },
        ],

        // Error tracking
        lastError: {
            message: String,
            timestamp: Date,
            code: String,
        },

        // Webhook settings (if using WhatsApp Business API)
        webhookConfig: {
            enabled: { type: Boolean, default: false },
            url: String,
            token: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
whatsAppAccountSchema.index({ accountId: 1, isActive: 1 });
whatsAppAccountSchema.index({ status: 1, isActive: 1 });
whatsAppAccountSchema.index({ phoneNumber: 1 }, { sparse: true });
whatsAppAccountSchema.index({ jid: 1 }, { sparse: true });
whatsAppAccountSchema.index({ assignedUsers: 1 });
whatsAppAccountSchema.index({ assignedDepartments: 1 });

// Virtual for connection uptime
whatsAppAccountSchema.virtual('uptime').get(function () {
    if (this.status === 'connected' && this.lastConnected) {
        return Date.now() - this.lastConnected.getTime();
    }
    return 0;
});

// Methods
whatsAppAccountSchema.methods.updateConnectionStatus = function (status, error = null) {
    this.status = status;
    if (status === 'connected') {
        this.lastConnected = new Date();
    } else if (status === 'disconnected' || status === 'error') {
        this.lastDisconnected = new Date();
    }

    if (error) {
        this.lastError = {
            message: error.message || error,
            timestamp: new Date(),
            code: error.code || 'UNKNOWN',
        };
    }

    return this.save();
};

whatsAppAccountSchema.methods.updateQR = function (qrCode, expiryMinutes = 60) {
    this.currentQR = qrCode;
    this.qrExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
    this.status = 'qr_pending';
    return this.save();
};

whatsAppAccountSchema.methods.clearQR = function () {
    this.currentQR = null;
    this.qrExpiry = null;
    return this.save();
};

whatsAppAccountSchema.methods.incrementMessageStats = function (sent = false, received = false) {
    if (sent) this.stats.totalMessagesSent += 1;
    if (received) this.stats.totalMessagesReceived += 1;
    this.stats.lastMessageTime = new Date();
    return this.save();
};

// Static methods
whatsAppAccountSchema.statics.getActiveAccounts = function () {
    return this.find({ isActive: true, status: { $ne: 'error' } });
};

whatsAppAccountSchema.statics.getConnectedAccounts = function () {
    return this.find({ isActive: true, status: 'connected' });
};

whatsAppAccountSchema.statics.findByJid = function (jid) {
    return this.findOne({ jid, isActive: true });
};

whatsAppAccountSchema.statics.findByPhoneNumber = function (phoneNumber) {
    return this.findOne({ phoneNumber, isActive: true });
};

const WhatsAppAccount = mongoose.model('WhatsAppAccount', whatsAppAccountSchema);

module.exports = WhatsAppAccount;
