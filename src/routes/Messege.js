const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const { getAllMessage, sendMessege, sendFile } = require('../controller/messageController');
const upload = require('../config/multerconfig');

// Router Declearation
const messageRouter = express.Router();

// Get All Meterials
messageRouter.get('/:id', checkLogin, getAllMessage);

// send a message to lead
messageRouter.post('/:id', checkLogin, sendMessege);

// send a file
messageRouter.post('/:id/attachment', checkLogin, upload.array('messageAttachment', 6), sendFile);

module.exports = messageRouter;
