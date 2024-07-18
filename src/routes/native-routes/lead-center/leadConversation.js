const express = require('express');
const getAllLeadConversations = require('../../../controller/lead/leadConversationController');

const leadConversationRouter = express.Router();

leadConversationRouter.get('/', getAllLeadConversations);

module.exports = leadConversationRouter;
