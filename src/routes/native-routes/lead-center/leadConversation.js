const express = require('express');
const { sendMessage } = require('../../../controller/messageController');
const { getAllLeadConversations, getLeadConversationDetails } = require('../../../controller/lead/leadConversationController');

const leadConversationRouter = express.Router();

leadConversationRouter.get('/', getAllLeadConversations);
leadConversationRouter.get('/:id', getLeadConversationDetails);
leadConversationRouter.post('/:id', sendMessage);

module.exports = leadConversationRouter;
