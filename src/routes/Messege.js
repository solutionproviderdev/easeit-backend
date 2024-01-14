const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const { getAllMessage } = require('../controller/messageController');

// Router Declearation
const messageRouter = express.Router();

// Get All Meterials
messageRouter.get('/:id', checkLogin, getAllMessage);

module.exports = messageRouter;
