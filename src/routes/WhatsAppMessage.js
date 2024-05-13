const express = require('express');
const {
    sendTextWaMessage,
    sendImageWaMessage,
    sendTemplateWaMessage,
} = require('../controller/whatsAppController');
const upload = require('../config/multerconfig');

// Router Declearation
const WaMessageRouter = express.Router();

// send a message to lead
WaMessageRouter.post('/text', sendTextWaMessage);
WaMessageRouter.post('/image', sendImageWaMessage);
// WaMessageRouter.post('/template', sendTemplateWaMessage);
WaMessageRouter.post('/template', upload.single('image'), sendTemplateWaMessage);

module.exports = WaMessageRouter;
