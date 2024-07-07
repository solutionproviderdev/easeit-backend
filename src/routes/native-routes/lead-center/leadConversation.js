const express = require('express');
const getAllLeadConversations = require('../../../controller/native/leadConversationController');

const leadConversationRouter = express.Router();

leadConversationRouter.get('/', getAllLeadConversations);

module.exports = leadConversationRouter;
