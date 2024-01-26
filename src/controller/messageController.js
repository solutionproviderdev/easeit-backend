const path = require('path');
const Conversation = require('../schemas/ConversationsSchema');
const Message = require('../schemas/MessageSchema');

const getAllMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversation: conversationId }).populate({
            path: 'sender',
            select: 'name avatar',
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const attachments = req.files?.map((file) => ({
            url: `${process.env.SERVER_URL}/images/${file.filename}`, // Adjust URL based on your public directory structure
        }));
        const newMessage = new Message({
            sender: req.user._id, // Assuming req.user is populated with the logged-in user's info
            content,
            attachments,
            conversation: conversationId,
        });
        await newMessage.save();

        // Update lastMessage in conversation
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: newMessage._id });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

module.exports = { getAllMessages, sendMessage };
