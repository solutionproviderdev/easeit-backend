/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const findCREWithLowestLeads = require('../helpers/findCREWithLowestLeads');

const logError = (message, error) => {
    const currentTime = new Date().toLocaleString();
    console.error(`${currentTime} => ${message}`);

    // Optionally, send the error to a logging service or notify via email/SMS
    // sendErrorNotification(message, error);
};

const getConversationsAndUpdateLeads = async () => {
    try {
        // Fetch the settings document for Facebook
        const fbSettings = await Settings.findOne({ name: 'facebook' });
        if (!fbSettings || !fbSettings.settingsData.page[0].pageAccessToken) {
            throw new Error('Facebook settings or access token not found');
        }
        const { pageAccessToken, pageId } = fbSettings.settingsData.page[0];

        // Fetch data from Messenger Platform API using the retrieved token
        const response = await axios.get(
            `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,from}&limit=${process.env.LIMIT}&access_token=${pageAccessToken}`,
            { timeout: 5000 }
        );

        const conversations = response.data.data;

        for (const conversation of conversations) {
            // Find the participant who is not 'Solution Provider'
            const otherParticipant = conversation.participants.data.find(
                (p) => p.name !== 'Solution Provider'
            );

            const fbSenderID = otherParticipant.id;
            const reversedMessages = [...conversation.messages.data].reverse();
            const messages = reversedMessages.map((msg) => ({
                messageId: msg.id,
                content: msg.message,
                senderId: msg.from.id,
                senderName: msg.from.name,
                sentByMe: msg.from.name === 'Solution Provider',
            }));

            const lead = await Lead.findOne({ fbSenderID });

            if (lead) {
                // Update existing Lead
                let isNewMessageAdded = false;
                for (const message of messages) {
                    if (!lead.messages.find((m) => m.messageId === message.messageId)) {
                        lead.messages.push(message);
                        isNewMessageAdded = true;
                    }
                }
                // Update lastMsg if new messages were added
                if (isNewMessageAdded) {
                    lead.lastMsg = messages[messages.length - 1].content;
                }
                await lead.save();
            } else {
                const cre = await findCREWithLowestLeads();

                // Create new Lead
                const newLead = new Lead({
                    CID: '', // Set this as needed
                    name: otherParticipant.name, // Set to the other participant's name
                    lastMsg: messages[messages.length - 1].content,
                    status: 'unread', // Default status, adjust as needed
                    fbSenderID,
                    messages,
                    source: 'Facebook',
                    creName: cre || 'Un Assigned', // Default CRE name
                    // ... other fields ...
                });
                await newLead.save();
            }
        }
    } catch (error) {
        logError('Error fetching or processing data', error);
    }
};

// Example function for sending error notifications (implement as needed)
const sendErrorNotification = (message, error) => {
    // Logic to send an email/SMS or log to a service like Sentry, LogRocket, etc.
};

module.exports = getConversationsAndUpdateLeads;
