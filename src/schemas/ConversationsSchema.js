const mongoose = require('mongoose');

const { Schema } = mongoose;

const conversationSchema = new Schema(
    {
        name: {
            type: String,
            required() {
                return this.isGroupChat;
            }, // Required only for group chats
        },
        isGroupChat: {
            type: Boolean,
            default: false,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'message',
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'people',
            },
        ],
        admin: {
            type: Schema.Types.ObjectId,
            ref: 'people', // Only needed for group chats
        },
    },
    { timestamps: true }
);

const Conversation = mongoose.model('conversation', conversationSchema);
module.exports = Conversation;
