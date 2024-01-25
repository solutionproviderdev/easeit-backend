const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'people', // Referencing People schema
            required: true,
        },
        content: String,
        attachments: [
            {
                url: String,
            },
        ],
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'conversation', // Referencing Conversation schema
            required: true,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model('message', messageSchema);
module.exports = Message;
