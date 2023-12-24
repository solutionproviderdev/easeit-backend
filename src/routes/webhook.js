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

webhookRouter.get(['/facebook', '/instagram'], (req, res) => {
    console.log(req.body);
    if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] == token) {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});

webhookRouter.post('/facebook', addFbLead);

webhookRouter.post('/comment/:id');

module.exports = webhookRouter;
