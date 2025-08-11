/* eslint-disable eqeqeq */
const express = require('express');
const {
	addFbLead,
	receiveWhatsappMessage,
	verifyWhatsappWebhook,
	metaWebhookVerify,
	metaWebhookReceive
} = require('../controller/webhookController');

const webhookRouter = express.Router();

// whatsapp webhook route

webhookRouter.get('/whatsapp', verifyWhatsappWebhook);
webhookRouter.post('/whatsapp', receiveWhatsappMessage);
webhookRouter.post('/facebook', addFbLead);

// meta webhooks --->

// Verification
webhookRouter.get('/meta-verify', metaWebhookVerify);
webhookRouter.post('/meta-webhook', express.json({ type: '*/*' }), metaWebhookReceive);



 
module.exports = webhookRouter;
