/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { default: axios } = require('axios');
const Settings = require('../../schemas/SettingsSchema');
const Lead = require('../../schemas/LeadsSchema');

// reused Functions for only this files.
function createNewMessageObject(messageId, content, senderId, sentByMe, fileUrl = null) {
    const newMessage = {
        messageId,
        content,
        senderId,
        sentByMe,
        date: new Date(),
    };

    if (fileUrl) {
        newMessage.fileUrl = [fileUrl];
    }

    return newMessage;
}

function emitNewMessage(req, leadId, newMessage) {
    req.io.emit(`fbMessage${leadId}`, newMessage);
}

exports.getAllLeadConversations = async (req, res) => {
    try {
        // Get the page and limit from query string, default to 1 and 10 if not provided
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const leadsWithLastMessage = await Lead.aggregate([
            {
                $addFields: {
                    lastMessage: { $last: '$messages.content' },
                    lastMessageTime: { $last: '$messages.date' },
                    sentByMe: { $last: '$messages.sentByMe' },
                    status: '$status',
                },
            },
            {
                $project: {
                    name: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    createdAt: 1,
                    status: 1,
                    sourcePageName: 1,
                    sourcePageId: 1,
                    sourcePageProfilePicture: 1,
                    sentByMe: 1,
                    creName: 1,
                    messagesSeen: 1,
                },
            },
        ])
            .sort({ lastMessageTime: -1 })
            .skip(skip)
            .limit(limit);

        // Get the total count of leads
        const totalLeads = await Lead.countDocuments();

        res.status(200).json({
            totalLeads,
            totalPages: Math.ceil(totalLeads / limit),
            currentPage: page,
            leads: leadsWithLastMessage,
        });
    } catch (error) {
        console.error('Error getting leads with last message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Controller function to get all messages for a specific lead
exports.getMessagesForLead = async (req, res) => {
    const { leadId } = req.params;
    console.log("lead id =",leadId)

    try {
        // Find the lead by ID
        const lead = await Lead.findById(leadId);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Return the messages for the specific lead
        res.status(200).json({
            messages: lead.messages,
            messagesSeen: lead.messagesSeen, // Include global message seen status
        });
    } catch (error) {
        console.error(`Error fetching messages for lead ${leadId}:`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Handler function to mark messages as seen
exports.markMessagesAsSeen = async (req, res) => {
    const { id } = req.params; // Lead ID

    try {
        // Find the lead by ID
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({ msg: 'Lead not found' });
        }

        // Update the messagesSeen field
        lead.messagesSeen = true;

        // Save the updated lead
        await lead.save();

        res.status(200).json({ msg: 'Messages marked as seen' });
    } catch (error) {
        console.error(`Error marking messages as seen for lead ${id}: ${error.message}`);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.sendMetaMessage = async (req, res) => {
    const { leadId } = req.params;
    const { messageType, content } = req.body;

    try {
        // Fetch lead details
        const lead = await Lead.findById(leadId);

        if (!lead || !lead.pageInfo.fbSenderID || !lead.pageInfo.pageId) {
            return res
                .status(404)
                .json({ error: 'Lead not found or missing Facebook ID or Page ID' });
        }

        // Fetch Facebook settings
        const settings = await Settings.findOne({ name: 'facebook' });

        if (!settings || !settings.settingsData.page) {
            return res.status(500).json({ error: 'Facebook settings or access token not found' });
        }

        // Find the specific page settings
        const pageSettings = settings.settingsData.page.find(
            (page) => page.pageId == lead.pageInfo.pageId
        );

        if (!pageSettings) {
            return res.status(404).json({ error: 'Facebook page settings not found' });
        }

        const { pageAccessToken, pageId } = pageSettings;
        const newMessages = []; // Array to store new message objects

        // Prepare the base message payload
        const messagePayload = {
            recipient: { id: lead.pageInfo.fbSenderID },
            messaging_type: 'RESPONSE',
            access_token: pageAccessToken, // Include access token in the payload
            message: {},
        };

        // Handle different types of messages
        if (messageType === 'text') {
            messagePayload.message = { text: content.text };

            // Send the text message through Meta API
            const fbResponse = await axios.post(
                `https://graph.facebook.com/v17.0/${pageId}/messages`,
                messagePayload
            );

            if (fbResponse.data && fbResponse.data.message_id) {
                const newMessage = createNewMessageObject(
                    fbResponse.data.message_id,
                    content.text,
                    pageId,
                    true
                );
                lead.messages.push(newMessage);
                await lead.save();

                emitNewMessage(req, leadId, newMessage);
                newMessages.push(newMessage);
            }
        } else if (['image', 'audio', 'video', 'file'].includes(messageType)) {
            for (const url of content.urls) {
                messagePayload.message = {
                    attachment: {
                        type: messageType,
                        payload: { url, is_reusable: true },
                    },
                };

                // Send the message through Meta API
                const fbResponse = await axios.post(
                    `https://graph.facebook.com/v17.0/${pageId}/messages`,
                    messagePayload
                );

                if (fbResponse.data && fbResponse.data.message_id) {
                    const newMessage = createNewMessageObject(
                        fbResponse.data.message_id,
                        '',
                        pageId,
                        true,
                        url
                    );
                    lead.messages.push(newMessage);
                    await lead.save();

                    emitNewMessage(req, leadId, newMessage);
                    newMessages.push(newMessage);
                }
            }
        } else if (messageType === 'sticker') {
            messagePayload.message = {
                attachment: {
                    type: 'image',
                    payload: { sticker_id: content.sticker_id },
                },
            };

            const fbResponse = await axios.post(
                `https://graph.facebook.com/v17.0/${pageId}/messages`,
                messagePayload
            );

            if (fbResponse.data && fbResponse.data.message_id) {
                const newMessage = createNewMessageObject(
                    fbResponse.data.message_id,
                    '',
                    pageId,
                    true,
                    content.sticker_id
                );
                lead.messages.push(newMessage);
                await lead.save();

                emitNewMessage(req, leadId, newMessage);
                newMessages.push(newMessage);
            }
        }

        // Return all successfully sent messages
        if (newMessages.length > 0) {
            return res.status(200).json({ messages: newMessages });
        }

        // If no messages were sent
        return res.status(500).json({ error: 'Failed to send message' });
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: error.toString() });
    }
};
