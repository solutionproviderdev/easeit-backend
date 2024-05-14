const express = require('express');
const { sendTemplateToLead } = require('../controller/whatsAppMessageController');

// Internal Imports
// const { checkLogin } = require('../middlewares/auth/checkLogin');

// Router Declearation
const wpMessageRouter = express.Router();

// send text message to lead
wpMessageRouter.post('/text', (req, res) => {
    // send text message logic
    console.log('Request Body: ', req.body);
});

// send template message to a custommer
wpMessageRouter.post('/:id', sendTemplateToLead);

module.exports = wpMessageRouter;
