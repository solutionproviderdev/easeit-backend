const express = require('express');
const {
    getAllLeadConversations,
    getAllLeadConversationUpdated,
    getMessagesForLead,
    markMessagesAsSeen,
    sendMetaMessage,
    searchLeads,
    toggleAIreplay,
    getAllLeeadConversionOfFolowUp,
    getAllUnseenConversation,
} = require('../../../controller/lead/leadConversationController');
const { validateSendMetaMessage } = require('../../../validators/leadConversationValidators');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const leadConversationRouter = express.Router();

// Existing endpoint to get all lead conversations
leadConversationRouter.get('/', checkAuth, getAllLeadConversationUpdated);

// New endpoint to get all lead conversations Followup
leadConversationRouter.get('/followup', checkAuth, getAllLeeadConversionOfFolowUp);

// New endpoint to get all lead conversations who is sitll unseen
leadConversationRouter.get('/unseen', checkAuth, getAllUnseenConversation);

// search endpoint for name and phone number
leadConversationRouter.get('/search/:pharams', searchLeads);

// New endpoint to get all messages for a specific lead
leadConversationRouter.get('/:leadId/messages', getMessagesForLead);

// New endpoint to Send a message to lead
leadConversationRouter.post('/:leadId/messages', validateSendMetaMessage, sendMetaMessage);

// New route for marking messages as seen
leadConversationRouter.put('/:id/mark-messages-seen', markMessagesAsSeen);

// New route for toggle AI Bot Reply
leadConversationRouter.put('/:id/toggle-ai-bot-reply', toggleAIreplay);


module.exports = leadConversationRouter;
