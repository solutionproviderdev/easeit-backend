/* eslint-disable eqeqeq */
const express = require('express');
const { addFbLead } = require('../controller/webhookController');

const webhookRouter = express.Router();

const token = process.env.TOKEN || 'himu';

const msgEventPostBody = {
    object: 'page',
    entry: [
        {
            id: '183776614824719',
            time: 1703402954070,
            messaging: [
                {
                    sender: { id: '24550961044518279' },
                    recipient: { id: '183776614824719' },
                    timestamp: 1703402953805,
                    message: {
                        mid: 'm_JFzo7uq2vkA0dXEwoahlcxY1a4pwq1x2U2RB-YH6e1trsBPgy_Ol7A7am4QWHbw-O-5qETqGLMEAF_VKrED-RQ',
                        text: 'Hi baby',
                    },
                },
            ],
        },
    ],
};
// facebook webhook route
webhookRouter.get(['/facebook', '/instagram', '/whatsapp'], (req, res) => {
    console.log(req.body);
    if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == token) {
        res.send(req.query['hub.challenge']);
        console.log('webhook pinged');
    } else {
        res.sendStatus(400);
    }
});
// routes for whatsapp

// Handles incoming POST requests from the services after verification
webhookRouter.post('/whatsapp', (req, res) => {
    console.log('Received POST request:', req.body);

    // Assuming the body structure as sent by WhatsApp, extract the message
    if (req.body.object === 'whatsapp_business_account') {
        const { messages } = req.body.entry[0].changes[0].value;
        if (messages) {
            const message = messages[0];
            console.log('Received message from WhatsApp:', message);

            // Here you can process the message further, e.g., send a reply or log it
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(400);
    }
});

// routes for fb
webhookRouter.post('/facebook', addFbLead);

webhookRouter.post('/comment/:id');

module.exports = webhookRouter;
