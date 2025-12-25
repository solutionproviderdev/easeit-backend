// src/services/WhatsApp/mongoAuthState.js
// MongoDB-based auth state implementation for Baileys WhatsApp client

const WhatsAppAccount = require('../../schemas/WhatsAppAccountSchema');

// Import Baileys utilities for proper auth state initialization
let initAuthCreds;
let BufferJSON;

async function loadBaileysUtils() {
    if (!initAuthCreds) {
        const baileys = await import('baileys');
        initAuthCreds = baileys.initAuthCreds;
        BufferJSON = baileys.BufferJSON;
    }
}

/**
 * Creates a MongoDB-based auth state for Baileys
 * @param {string} accountId - Unique identifier for the WhatsApp account
 * @returns {Object} Auth state object compatible with Baileys
 */
async function useMongoAuthState(accountId = 'default') {
    // Find or create WhatsApp account document
    let account = await WhatsAppAccount.findOne({ accountId });

    if (!account) {
        account = new WhatsAppAccount({
            accountId,
            accountName: `WhatsApp Account ${accountId}`,
            status: 'disconnected',
            authState: {
                creds: {},
                keys: {},
            },
        });
        await account.save();
    }

    // Load existing auth state if available and valid
    await loadBaileysUtils();

    let state;

    // Check if we have valid existing credentials
    if (account.authState?.creds && Object.keys(account.authState.creds).length > 0) {
        console.log('Loading existing auth state from MongoDB');
        try {
            // Properly handle MongoDB Binary data conversion
            const creds = account.authState.creds;
            const keys = account.authState.keys || {};
            
            // Convert any MongoDB Binary objects to Buffers
            const convertBinaryToBuffer = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                
                const converted = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (value && value._bsontype === 'Binary') {
                        converted[key] = Buffer.from(value.buffer);
                    } else if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
                        converted[key] = convertBinaryToBuffer(value);
                    } else {
                        converted[key] = value;
                    }
                }
                return converted;
            };

            state = {
                creds: convertBinaryToBuffer(creds),
                keys: convertBinaryToBuffer(keys),
            };
            
            console.log('Successfully loaded and converted existing auth state');
        } catch (error) {
            console.error('Error loading auth state, creating fresh:', error);
            state = {
                creds: initAuthCreds(),
                keys: {},
            };
        }
    } else {
        console.log('Creating fresh auth state');
        state = {
            creds: initAuthCreds(),
            keys: {},
        };
    }

    /**
     * Save credentials to MongoDB
     */
    const saveCreds = async () => {
        try {
            await WhatsAppAccount.updateOne(
                { accountId },
                {
                    $set: {
                        'authState.creds': state.creds,
                        lastConnected: new Date(),
                    },
                }
            );
        } catch (error) {
            console.error('Error saving credentials to MongoDB:', error);
        }
    };

    /**
     * Save keys to MongoDB
     */
    const saveKeys = async () => {
        try {
            await WhatsAppAccount.updateOne(
                { accountId },
                {
                    $set: {
                        'authState.keys': state.keys,
                    },
                }
            );
        } catch (error) {
            console.error('Error saving keys to MongoDB:', error);
        }
    };

    /**
     * Clear auth state from MongoDB
     */
    const clearState = async () => {
        try {
            await WhatsAppAccount.updateOne(
                { accountId },
                {
                    $set: {
                        'authState.creds': {},
                        'authState.keys': {},
                        status: 'disconnected',
                        lastDisconnected: new Date(),
                    },
                }
            );
            state.creds = {};
            state.keys = {};
        } catch (error) {
            console.error('Error clearing auth state from MongoDB:', error);
        }
    };

    /**
     * Update connection status
     */
    const updateStatus = async (status, phoneNumber = null, jid = null) => {
        try {
            const updateData = { status };
            if (phoneNumber) updateData.phoneNumber = phoneNumber;
            if (jid) updateData.jid = jid;
            if (status === 'connected') updateData.lastConnected = new Date();
            if (status === 'disconnected') updateData.lastDisconnected = new Date();

            await WhatsAppAccount.updateOne({ accountId }, { $set: updateData });
        } catch (error) {
            console.error('Error updating connection status:', error);
        }
    };

    /**
     * Update QR code
     */
    const updateQR = async (qrCode) => {
        try {
            await WhatsAppAccount.updateOne(
                { accountId },
                {
                    $set: {
                        currentQR: qrCode,
                        qrExpiry: new Date(Date.now() + 60 * 1000), // 1 minute expiry
                        status: 'qr_pending',
                    },
                }
            );
        } catch (error) {
            console.error('Error updating QR code:', error);
        }
    };

    /**
     * Clear QR code
     */
    const clearQR = async () => {
        try {
            await WhatsAppAccount.updateOne(
                { accountId },
                {
                    $set: {
                        currentQR: null,
                        qrExpiry: null,
                    },
                }
            );
        } catch (error) {
            console.error('Error clearing QR code:', error);
        }
    };

    const clearAuthState = async () => {
        try {
            await WhatsAppAccount.findOneAndUpdate(
                { accountId: accountId },
                { 
                    $unset: { 
                        authState: 1 
                    } 
                },
                { new: true }
            );
            console.log('Auth state cleared from MongoDB');
        } catch (error) {
            console.error('Error clearing auth state from MongoDB:', error);
        }
    };

    // Add get and set methods to the keys object for Baileys compatibility
    state.keys.get = (type, ids) => {
        if (!Array.isArray(ids)) {
            const key = state.keys[type]?.[ids];
            return key;
        }

        const result = {};
        ids.forEach((id) => {
            const key = state.keys[type]?.[id];
            if (key) {
                result[id] = key;
            }
        });
        return result;
    };

    state.keys.set = (data) => {
        Object.keys(data).forEach((category) => {
            if (!state.keys[category]) {
                state.keys[category] = {};
            }
            Object.assign(state.keys[category], data[category]);
        });
        // Auto-save keys when they're updated
        saveKeys();
    };

    return {
        state,
        saveCreds,
        saveKeys,
        clearState,
        updateStatus,
        updateQR,
        clearQR,
        clearAuthState,
    };
}

/**
 * Get account information
 */
async function getAccountInfo(accountId = 'default') {
    try {
        const account = await WhatsAppAccount.findOne({ accountId });
        return account;
    } catch (error) {
        console.error('Error getting account info:', error);
        return null;
    }
}

/**
 * Get current QR code
 */
async function getCurrentQR(accountId = 'default') {
    try {
        const account = await WhatsAppAccount.findOne({ accountId });
        if (account && account.currentQR && account.qrExpiry > new Date()) {
            return account.currentQR;
        }
        return null;
    } catch (error) {
        console.error('Error getting current QR:', error);
        return null;
    }
}

module.exports = {
    useMongoAuthState,
    getAccountInfo,
    getCurrentQR,
};
