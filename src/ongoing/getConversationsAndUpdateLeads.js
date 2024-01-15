/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const Lead = require('../schemas/LeadsSchema');

const getConversationsAndUpdateLeads = async () => {
    try {
        // Fetch data from Messenger Platform API
        const response = await axios.get(
            `https://graph.facebook.com/2078095355564923/conversations?fields=participants,messages{id,message,from}&limit=${process.env.LIMIT}&access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            { timeout: 10000 }
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
                // Create new Lead
                const newLead = new Lead({
                    CID: '', // Set this as needed
                    name: otherParticipant.name, // Set to the other participant's name
                    lastMsg: messages[messages.length - 1].content,
                    status: 'unread', // Default status, adjust as needed
                    fbSenderID,
                    messages,
                    source: 'Facebook',
                    creName: 'Un Assigned', // Default CRE name
                    // ... other fields ...
                });
                await newLead.save();
            }
        }
    } catch (error) {
        console.error('Error fetching or processing data:');
    }
};

module.exports = getConversationsAndUpdateLeads;
