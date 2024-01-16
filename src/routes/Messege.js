const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const { getAllMessage, sendMessege } = require('../controller/messageController');

// Router Declearation
const messageRouter = express.Router();

// Get All Meterials
messageRouter.get('/:id', checkLogin, getAllMessage);

// send a message to lead
messageRouter.post('/:id', checkLogin, sendMessege);

module.exports = messageRouter;
