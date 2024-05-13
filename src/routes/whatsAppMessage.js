const express = require('express');
const { sendTemplateToLead } = require('../controller/whatsAppMessageController');

// Internal Imports
// const { checkLogin } = require('../middlewares/auth/checkLogin');

// Router Declearation
const wpMessageRouter = express.Router();

// send template message to a custommer
wpMessageRouter.post('/:id', sendTemplateToLead);

module.exports = wpMessageRouter;
