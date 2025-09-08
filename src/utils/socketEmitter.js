/**
 * Socket Emitter Utility
 * Centralized functions for emitting socket events related to messages
 */
const { getIO } = require('../socket/socketService');

/**
 * Emit a message event for a specific lead
 * @param {Object} options - The options object
 * @param {Object} options.io - Socket.io instance (optional if using global instance)
 * @param {String} options.leadId - The lead ID
 * @param {Object} options.message - The message object to emit
 * @param {Object} options.req - Express request object (optional, used if io is not provided)
 */
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
const emitConversationUpdate = ({ io, lead, req }) => {
    // Use provided io, or get from request, or get from global service
    const socketIo = io || (req && req.io) || getIO();

    const lastMessage = lead.messages[lead.messages.length - 1];

    const socketPayload = {
        name: lead.name,
        sourcePageName: lead.sourcePageName,
        sourcePageId: lead.sourcePageId,
        sourcePageProfilePicture: lead.sourcePageProfilePicture,
        lastMessage: lastMessage.content,
        lastMessageTime: lastMessage.date,
        sentByMe: lastMessage.sentByMe,
        createdAt: lead.createdAt,
        _id: lead._id,
    };

    socketIo.emit('conversation', socketPayload);
};

module.exports = {
    emitLeadMessage,
    emitConversationUpdate,
};
