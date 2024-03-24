/**
 * Fetches conversations from the Facebook Graph API using the provided page access token,
 * updates existing leads or creates new leads with the conversation messages,
 * and emits socket.io events when new messages are added.
 */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const findCREWithLowestLeads = require('../helpers/findCREWithLowestLeads');
const People = require('../schemas/PeopleSchema');

const logError = (message, error) => {
    const currentTime = new Date().toLocaleString();
    console.error(`${currentTime} => ${message}`);
    // Optionally, send the error to a logging service or notify via email/SMS
    // sendErrorNotification(message, error);
};

const getConversationsAndUpdateLeads = async (io) => {
    try {
        // Fetch the settings document for Facebook
        const fbSettings = await Settings.findOne({ name: 'facebook' });
        if (!fbSettings || !fbSettings.settingsData.page[0].pageAccessToken) {
            throw new Error('Facebook settings or access token not found');
        }
        const { pageAccessToken, pageId } = fbSettings.settingsData.page[0];

        // Fetch data from Messenger Platform API using the retrieved token
        const response = await axios.get(
            `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,attachments{image_data},from}&limit=${process.env.LIMIT}&access_token=${pageAccessToken}`,
            { timeout: 5000 }
        );

        const conversations = response.data.data;

        for (const conversation of conversations) {
            try {
                // Find the participant who is not 'Solution Provider'
                const otherParticipant = conversation.participants.data.find(
                    (p) => p.name !== 'Solution Provider'
                );

                const fbSenderID = otherParticipant.id;
                const reversedMessages = [...conversation.messages.data].reverse();
                // Assuming this is part of the loop where you process each message
                const messages = reversedMessages.map((msg) => {
                    // Initialize an empty array to hold attachment URLs
                    let fileUrl = [];

                    // Check if the message has attachments and extract URLs
                    if (msg.attachments && msg.attachments.data.length > 0) {
                        fileUrl = msg.attachments.data.map((att) => att.image_data.url);
                    }

                    return {
                        messageId: msg.id,
                        content: msg.message,
                        senderId: msg.from.id,
                        senderName: msg.from.name,
                        sentByMe: msg.from.name === 'Solution Provider',
                        date: Date.now(),
                        fileUrl,
                    };
                });

                const lead = await Lead.findOne({ fbSenderID });

                if (lead) {
                    // Update existing Lead
                    let isNewMessageAdded = false;
                    for (const message of messages) {
                        if (!lead.messages.find((m) => m.messageId === message.messageId)) {
                            lead.messages.push(message);

                            // Emit socket io action
                            io.emit(`fbMessage${lead._id}`, message);
                            isNewMessageAdded = true;
                        }
                    }
                    if (isNewMessageAdded) {
                        lead.lastMsg = messages[messages.length - 1].content;
                    }
                    const savedLead = await lead.save();

                    // Sockt Payload for new Conversation.
                    const socketPayload = {
                        name: savedLead.name,
                        lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
                        lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
                        sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
                        createdAt: savedLead.createdAt,
                        creName: savedLead.creName,
                        status: savedLead.status,
                        _id: savedLead._id,
                    };

                    // Emit socket io action for conversation.
                    io.emit('conversation', socketPayload);
                } else {
                    const cre = await findCREWithLowestLeads();
                    // Create new Lead
                    const newLead = new Lead({
                        // ...new lead data
                        CID: '',
                        name: otherParticipant.name,
                        lastMsg: messages[messages.length - 1].content,
                        status: 'unread',
                        fbSenderID,
                        messages,
                        source: 'Facebook',
                        creName: cre,
                    });
                    const savedNewLead = await newLead.save();
                    const socketPayload = {
                        name: savedNewLead.name,
                        lastMessage: savedNewLead.lastMsg,
                        lastMessageTime: savedNewLead.messages[0].date,
                        sentByMe: savedNewLead.messages[0].sentByMe,
                        createdAt: savedNewLead.createdAt,
                        _id: savedNewLead._id,
                    };

                    // Emit socket io action for new Conversations.
                    io.emit('conversation', socketPayload);

                    // Socket payload for new Lead with populated data
                    const socketPayloadNewLead = {
                        ...savedNewLead._doc,
                        status: savedNewLead.status,
                        creName: await People.findOne({ _id: cre }).select('name roal avatar'),
                    };

                    // Emit socket io action for new Lead.
                    io.emit('newLead', { newLead: socketPayloadNewLead });
                }
            } catch (innerError) {
                logError('Error processing a single conversation', innerError);
                console.log(innerError);
                // eslint-disable-next-line no-continue
                continue; // Move to the next conversation
            }
        }
    } catch (error) {
        logError('Error fetching or processing data', error);
    }
};

module.exports = getConversationsAndUpdateLeads;
