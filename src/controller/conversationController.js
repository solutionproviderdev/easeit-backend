const Conversation = require('../schemas/ConversationsSchema');
const Message = require('../schemas/MessageSchema');

const getAllChats = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const conversations = await Conversation.find({ participants: userId })
            .populate('lastMessage')
            .populate({
                path: 'participants',
                select: 'name avatar',
            });
        res.status(200).json(conversations);
    } catch (error) {
        next(error);
      //  console.log(error);
    }
};

const getGroupChatDetails = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const conversation = await Conversation.findById(chatId).populate('participants', 'name');
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        res.status(200).json(conversation);
    } catch (error) {
        next(error);
    }
};

const createOrGetAOneOnOneChat = async (req, res, next) => {
    try {
        const { receiverId } = req.params;
        const existingConversation = await Conversation.findOne({
            isGroupChat: false,
            participants: { $all: [req.user._id, receiverId] },
        });
        if (existingConversation) {
            return res.status(200).json(existingConversation);
        }
        const newConversation = await Conversation.create({
            participants: [req.user._id, receiverId],
        });
        res.status(201).json(newConversation);
    } catch (error) {
        next(error);
    }
};

const createAGroupChat = async (req, res, next) => {
    try {
        const { name, participants } = req.body;
        participants.push(req.user._id); // Add the creator to participants
        const newConversation = await Conversation.create({
            name,
            isGroupChat: true,
            participants,
            admin: req.user._id,
            avatar: `${process.env.SERVER_URL}/images/simple-group-user-icon.jpg`,
        });
        res.status(201).json(newConversation);
    } catch (error) {
        next(error);
    }
};

const renameGroupChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { name } = req.body;
        const updatedConversation = await Conversation.findByIdAndUpdate(
            chatId,
            { name },
            { new: true }
        );
        res.status(200).json(updatedConversation);
    } catch (error) {
        next(error);
    }
};

const deleteGroupChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        await Conversation.findByIdAndDelete(chatId);
        await Message.deleteMany({ conversation: chatId });
        res.status(200).json({ message: 'Conversation deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const addNewParticipantInGroupChat = async (req, res, next) => {
    try {
        const { chatId, participantId } = req.params;
        await Conversation.findByIdAndUpdate(chatId, {
            $addToSet: { participants: participantId },
        });
        res.status(200).json({ message: 'Participant added successfully' });
    } catch (error) {
        next(error);
    }
};

const removeParticipantFromGroupChat = async (req, res, next) => {
    try {
        const { chatId, participantId } = req.params;
        await Conversation.findByIdAndUpdate(chatId, { $pull: { participants: participantId } });
        res.status(200).json({ message: 'Participant removed successfully' });
    } catch (error) {
        next(error);
    }
};

const leaveGroupChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        await Conversation.findByIdAndUpdate(chatId, { $pull: { participants: req.user._id } });
        res.status(200).json({ message: 'Left group chat successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllChats,
    getGroupChatDetails,
    createOrGetAOneOnOneChat,
    createAGroupChat,
    renameGroupChat,
    deleteGroupChat,
    addNewParticipantInGroupChat,
    removeParticipantFromGroupChat,
    leaveGroupChat,
};
