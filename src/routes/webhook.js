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
webhookRouter.get(['/facebook', '/instagram'], (req, res) => {
    console.log(req.body);
    if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == token) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});

// whatsapp webhook route
webhookRouter.get('/whatsapp', (req, res) => {
    console.log('Received webhook verification request:', req.query);

    const VERIFY_TOKEN = 'apple';
    const mode = req.query['hub.mode'];
    const watoken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && watoken && challenge) {
        if (mode === 'subscribe' && watoken === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
            console.log(challenge);
        } else {
            console.log(
                `Failed verification: Incorrect mode or token. Mode: ${mode}, Token: ${watoken}`
            );
            res.sendStatus(403);
        }
    } else {
        console.log('Failed verification: Missing required query parameters', req.query);
        res.sendStatus(400);
    }
});

webhookRouter.post('/facebook', addFbLead);

webhookRouter.post('/comment/:id');

module.exports = webhookRouter;
