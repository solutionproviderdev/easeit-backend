const express = require('express');
const { sendTemplateToLead } = require('../controller/whatsAppMessageController');
const {
    sendTextWaMessage,
    sendImageWaMessage,
    sendTemplateWaMessage,
} = require('../controller/whatsAppController');

// Internal Imports
// const { checkLogin } = require('../middlewares/auth/checkLogin');

// Router Declearation
const wpMessageRouter = express.Router();

// send text message to lead
wpMessageRouter.post('/text', (req, res) => {
    // send text message logic
    console.log('Request Body: ', req.body);
});
wpMessageRouter.post('/text', sendTextWaMessage);
wpMessageRouter.post('/image', sendImageWaMessage);
wpMessageRouter.post('/template', sendTemplateWaMessage);
// send template message to a custommer
wpMessageRouter.post('/:id', sendTemplateToLead);

module.exports = wpMessageRouter;
