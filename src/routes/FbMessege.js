const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    getAllMessage,
    sendMessege,
    sendFile,
    getSortedLeads,
    getAllLeads,
    sendMessageWithAttachment,
    getLeadDetailsWithLastMessage,
} = require('../controller/FbMessageController');
const upload = require('../config/multerconfig');

// Router Declearation
const fbMessageRouter = express.Router();

// Add this new route
fbMessageRouter.get('/all-leads', checkLogin, getAllLeads);

// Get leads sorted by newest message or most recent leads
fbMessageRouter.get('/sorted-conversations', checkLogin, getSortedLeads);

// New route for getting leads with last message details
fbMessageRouter.get('/conversations', checkLogin, getLeadDetailsWithLastMessage);

// Get All Meterials
fbMessageRouter.get('/:id', checkLogin, getAllMessage);

// New route for sending a message with attachments
fbMessageRouter.post(
    '/:id/message-with-attachment',
    checkLogin,
    upload.array('messageAttachment', 6),
    sendMessageWithAttachment
); // active

// send a message to lead
fbMessageRouter.post('/:id', checkLogin, sendMessege); // inactive

// send a file
fbMessageRouter.post('/:id/attachment', checkLogin, upload.array('messageAttachment', 6), sendFile); // inactive

module.exports = fbMessageRouter;
