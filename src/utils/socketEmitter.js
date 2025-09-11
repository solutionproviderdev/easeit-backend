/**
 * Socket Emitter Utility
 * Centralized functions for emitting socket events related to messages
 */
const { getIO } = require('../socket/socketService');
const User = require('../schemas/auth/UserSchema');

// User cache for performance optimization
const userCache = new Map();
let cacheLastUpdated = null;
const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize and refresh user cache
 */
async function refreshUserCache() {
    try {
        const users = await User.find(
            {},
            {
                _id: 1,
                nameAsPerNID: 1,
                nickname: 1,
                profilePicture: 1,
            }
        );

        userCache.clear();
        users.forEach((user) => {
            userCache.set(user._id.toString(), {
                _id: user._id,
                nameAsPerNID: user.nameAsPerNID,
                nickname: user.nickname,
                profilePicture: user.profilePicture,
            });
        });

        cacheLastUpdated = Date.now();
        console.log(`User cache refreshed with ${users.length} users`);
    } catch (error) {
        console.error('Error refreshing user cache:', error);
    }
}

/**
 * Get user from cache, refresh if needed
 */
async function getCachedUser(userId) {
    // Initialize cache if not done or refresh if expired
    if (!cacheLastUpdated || Date.now() - cacheLastUpdated > CACHE_REFRESH_INTERVAL) {
        await refreshUserCache();
    }

    return userCache.get(userId?.toString());
}

// Initialize cache on module load
refreshUserCache();

/**
 * Emit a message event for a specific lead
 * @param {Object} options - The options object
 * @param {Object} options.io - Socket.io instance (optional if using global instance)
 * @param {String} options.leadId - The lead ID
 * @param {Object} options.message - The message object to emit
 * @param {Object} options.req - Express request object (optional, used if io is not provided)
 */
// eslint-disable-next-line object-curly-newline
const emitLeadMessage = ({ leadId, message, io, req }) => {
    // Use provided io, or get from request, or get from global service
    const socketIo = io || (req && req.io) || getIO();

    // Emit the message event
    socketIo.emit(`fbMessage${leadId}`, message);
};

/**
 * Emit a conversation update event
 * @param {Object} options - The options object
 * @param {Object} options.io - Socket.io instance (optional if using global instance)
 * @param {Object} options.lead - The lead object with messages
 * @param {Object} options.req - Express request object (optional, used if io is not provided)
 */
const emitConversationUpdate = async ({ io, lead, req }) => {
    // Use provided io, or get from request, or get from global service
    const socketIo = io || (req && req.io) || getIO();

    const lastMessage = lead.messages[lead.messages.length - 1];

    // Get cached user data for creName
    const cachedUser = await getCachedUser(lead.creName);

    const socketPayload = {
        name: lead.name,
        pageInfo: lead.pageInfo,
        lastMessage: lastMessage.content,
        lastMessageTime: lastMessage.date,
        sentByMe: lastMessage.sentByMe,
        createdAt: lead.createdAt,
        _id: lead._id,
        CID: lead.CID,
        profilePicture: lead.profilePicture,
        status: lead.status,
        creName: cachedUser || lead.creName,
        messagesSeen: lead.messagesSeen,
        lastCustomerMessageTime: lead.lastCustomerMessageTime,
        phone: lead.phone,
    };

    socketIo.emit('conversation', socketPayload);
};

module.exports = {
    emitLeadMessage,
    emitConversationUpdate,
};
