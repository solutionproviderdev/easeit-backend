const express = require('express');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    getAllChats,
    createOrGetAOneOnOneChat,
    createAGroupChat,
    getGroupChatDetails,
    renameGroupChat,
    deleteGroupChat,
    addNewParticipantInGroupChat,
    removeParticipantFromGroupChat,
    leaveGroupChat,
} = require('../controller/conversationController');

const conversationRouter = express.Router();

// Get all conversations for a user
conversationRouter.get('/', checkLogin, getAllChats);

// Get details of a specific group chat
conversationRouter.get('/group/:chatId', checkLogin, getGroupChatDetails);

// Create or get a one-on-one chat
conversationRouter.post('/oneonone/:receiverId', checkLogin, createOrGetAOneOnOneChat);

// Create a group chat
conversationRouter.post('/group', checkLogin, createAGroupChat);

// Update the name of a group chat
conversationRouter.put('/group/:chatId', checkLogin, renameGroupChat);

// Delete a group chat
conversationRouter.delete('/group/:chatId', checkLogin, deleteGroupChat);

// Add a new participant to a group chat
conversationRouter.post(
    '/group/:chatId/participant/:participantId',
    checkLogin,
    addNewParticipantInGroupChat
);

// Remove a participant from a group chat
conversationRouter.delete(
    '/group/:chatId/participant/:participantId',
    checkLogin,
    removeParticipantFromGroupChat
);

// Leave a group chat
conversationRouter.delete('/leave/group/:chatId', checkLogin, leaveGroupChat);

module.exports = conversationRouter;
