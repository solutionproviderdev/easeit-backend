const express = require('express');
const {
    getAllLeadConversations,
    getMessagesForLead,
    markMessagesAsSeen,
    sendMetaMessage,
} = require('../../../controller/lead/leadConversationController');
const { validateSendMetaMessage } = require('../../../validators/leadConversationValidators');

const leadConversationRouter = express.Router();

// Existing endpoint to get all lead conversations
leadConversationRouter.get('/', getAllLeadConversations);

// New endpoint to get all messages for a specific lead
leadConversationRouter.get('/:leadId/messages', getMessagesForLead);

// New endpoint to Send a message to lead
leadConversationRouter.post('/:leadId/messages', sendMetaMessage);

// New route for marking messages as seen
leadConversationRouter.put('/:id/mark-messages-seen', validateSendMetaMessage, markMessagesAsSeen);

module.exports = leadConversationRouter;
