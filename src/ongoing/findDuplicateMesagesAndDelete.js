/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const Lead = require('../schemas/LeadsSchema');

const findDuplicateMessagesAndDelete = async () => {
    try {
        // Get all leads
        const leads = await Lead.find({});
        let totalDuplicatesRemoved = 0;

        // Process each lead
        for (const lead of leads) {
            // Create a map to store unique messages
            const uniqueMessages = new Map();
            const duplicateMessageIds = [];

            // Process each message
            lead.messages.forEach((message) => {
                const messageKey = `${message.content}_${message.senderId}_${message.date}`;

                if (uniqueMessages.has(messageKey)) {
                    // This is a duplicate message
                    duplicateMessageIds.push(message._id);
                } else {
                    // This is a unique message
                    uniqueMessages.set(messageKey, message);
                }
            });

            // If duplicates found, update the lead
            if (duplicateMessageIds.length > 0) {
                // Filter out duplicate messages
                const updatedMessages = lead.messages.filter(
                    (message) => !duplicateMessageIds.includes(message._id)
                );

                // Update the lead with unique messages
                await Lead.findByIdAndUpdate(
                    lead._id,
                    { $set: { messages: updatedMessages } },
                    { new: true }
                );

                totalDuplicatesRemoved += duplicateMessageIds.length;
            }
        }

        console.log(`Total duplicate messages removed: ${totalDuplicatesRemoved}`);
        return { success: true, totalDuplicatesRemoved };
    } catch (error) {
        console.error('Error removing duplicate messages:', error);
        return { success: false, error: error.message };
    }
};

module.exports = findDuplicateMessagesAndDelete;
