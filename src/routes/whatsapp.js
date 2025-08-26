const whatsAppRouter = require('express').Router();
const whatsappController = require('../controller/whatsApp/whatsapp.controller');

// get status
whatsAppRouter.get('/status', whatsappController.status);

// restart
whatsAppRouter.post('/restart', whatsappController.restart);

// send message
whatsAppRouter.post('/send', whatsappController.send);

// logout
whatsAppRouter.post('/logout', whatsappController.logout);

// Qr
whatsAppRouter.get('/qr', whatsappController.qr);

module.exports = whatsAppRouter;
