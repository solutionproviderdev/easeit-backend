const express = require('express');
const {getAllLeadConversations, getLeadConversationDetails, sendMessage,} = require('../../../controller/native/leadConversationController');

const leadConversationRouter = express.Router();

leadConversationRouter.get('/', getAllLeadConversations);
leadConversationRouter.get('/:id', getLeadConversationDetails);
leadConversationRouter.post('/:id', sendMessage);

module.exports = leadConversationRouter;
