const express = require('express');
const getAllLeadConversations = require('../../../controller/lead/leadConversationController');

const leadConversationRouter = express.Router();

leadConversationRouter.get('/', getAllLeadConversations);
leadConversationRouter.get('/:id', getLeadConversationDetails);
leadConversationRouter.post('/:id', sendMessage);

module.exports = leadConversationRouter;
