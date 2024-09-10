const express = require('express');
const {
    getAllLeadConversations,
    getMessagesForLead,
} = require('../../../controller/lead/leadConversationController');

const leadConversationRouter = express.Router();

// Existing endpoint to get all lead conversations
leadConversationRouter.get('/', getAllLeadConversations);

// New endpoint to get all messages for a specific lead
leadConversationRouter.get('/:leadId/messages', getMessagesForLead);

module.exports = leadConversationRouter;
