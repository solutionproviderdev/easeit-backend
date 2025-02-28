const axios = require('axios');
const Settings = require('../schemas/SettingsSchema');
const Lead = require('../schemas/LeadsSchema');

/**
 * Helper function to create a new message object.
 * Adjust this function to match your message schema.
 *
 * @param {string} messageId - The message ID returned by the Meta API.
 * @param {string} content - The text content of the message.
 * @param {string} pageId - The Facebook page ID.
 * @param {boolean} sentByMe - Indicates if the message was sent by the system.
 * @param {string} [url] - Optional URL if the message has an attachment.
 * @returns {Object} - A new message object.
 */
const createNewMessageObject = (messageId, content, pageId, sentByMe, url) => ({
    messageId,
    content,
    senderId: pageId,
    sentByMe,
    fileUrl: url ? [url] : [],
    isSticker: false,
    isAiMessage: false,
    isAutomatedMessage: true,
    date: new Date(),
});

/**
 * Sends an auto message to the lead identified by leadId.
 *
 * Steps:
 * 1. Retrieve the lead from the database.
 * 2. Retrieve the Facebook settings and locate the specific page settings
 *    using the lead’s pageInfo.
 * 3. Prepare and send the message payload to the Meta Messenger API.
 * 4. If successful, create a new message object, push it into the lead’s messages array,
 *    increment autoMessageSentCount, and save the lead.
 * 5. Return true if everything succeeds; otherwise, return false.
 *
 * @param {string} leadId - The ID of the lead.
 * @param {string} message - The message to send.
 * @returns {Promise<boolean>} - True if message sent and saved successfully, false otherwise.
 */
const sendMessageToLead = async (leadId, message) => {
    try {
        // Retrieve the lead document by ID.
        const lead = await Lead.findById(leadId);
        if (!lead || !lead.pageInfo || !lead.pageInfo.fbSenderID || !lead.pageInfo.pageId) {
            console.error('Lead missing required Facebook page information.');
            return false;
        }

        // Retrieve Facebook settings.
        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page) {
            console.error('Facebook settings or access token not found.');
            return false;
        }

        // Locate the specific page settings using the lead's pageId.
        const pageSettings = settings.settingsData.page.find(
            (page) => page.pageId === lead.pageInfo.pageId
        );
        if (!pageSettings) {
            console.error('Facebook page settings not found.');
            return false;
        }

        const { pageAccessToken, pageId } = pageSettings;

        // Prepare the message payload.
        const messagePayload = {
            recipient: { id: lead.pageInfo.fbSenderID },
            messaging_type: 'RESPONSE',
            access_token: pageAccessToken,
            message: { text: message },
        };

        // Send the message through the Meta Messenger API.
        const fbResponse = await axios.post(
            `https://graph.facebook.com/v17.0/${pageId}/messages`,
            messagePayload
        );

        if (fbResponse.data && fbResponse.data.message_id) {
            // Create a new message object.
            const newMessage = createNewMessageObject(
                fbResponse.data.message_id,
                message,
                pageId,
                true
            );

            // Add the new message to the lead's messages array.
            lead.messages.push(newMessage);

            // Increment the autoMessageSentCount (initialize if not present).
            lead.autoMessageSentCount = (lead.autoMessageSentCount || 0) + 1;

            // Save the updated lead.
            await lead.save();

            return true;
        }
        console.error('Failed to send message via Meta Messenger API.');
        return false;
    } catch (error) {
        console.error('Error in sendMessageToLead:', error.message);
        return false;
    }
};

module.exports = {
    sendMessageToLead,
};
