const express = require('express');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const { upload } = require('../config/multerconfig');
const { getAllMessages, sendMessage } = require('../controller/messageController');

const messageRouter = express.Router();

messageRouter.use(checkLogin);

messageRouter
    .route('/:conversationId')
    .get(getAllMessages)
    .post(upload.array('attachments', 6), sendMessage);

module.exports = messageRouter;
