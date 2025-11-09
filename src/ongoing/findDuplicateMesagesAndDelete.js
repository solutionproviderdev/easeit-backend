/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
const Lead = require('../schemas/LeadsSchema');

const findDuplicateMessagesAndDelete = async () => {
    try {
        // Stream leads to avoid loading entire collection into memory
        const cursor = Lead.find({}, { messages: 1 }).lean().cursor();

        let totalDuplicatesRemoved = 0;

        for await (const lead of cursor) {
            if (!Array.isArray(lead.messages) || lead.messages.length === 0) continue;

            const uniqueMessages = new Map();
            const duplicateMessageIds = [];

            for (const message of lead.messages) {
                const messageKey = `${message.content}_${message.senderId}_${message.date}`;
                if (uniqueMessages.has(messageKey)) {
                    duplicateMessageIds.push(message._id);
                } else {
                    uniqueMessages.set(messageKey, message._id);
                }
            }

            if (duplicateMessageIds.length > 0) {
                const updatedMessages = lead.messages.filter(
                    (message) => !duplicateMessageIds.includes(message._id)
                );

                await Lead.updateOne({ _id: lead._id }, { $set: { messages: updatedMessages } });

                totalDuplicatesRemoved += duplicateMessageIds.length;
            }
        }

        return { success: true, totalDuplicatesRemoved };
    } catch (error) {
        console.error('Error removing duplicate messages:', error);
        return { success: false, error: error.message };
    }
};

module.exports = findDuplicateMessagesAndDelete;
