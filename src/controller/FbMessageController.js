/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const axios = require('axios');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');

// Function to get all messages for a specific lead
const getAllMessage = async (req, res) => {
    try {
        const { id } = req.params; // This assumes the ID in the URL is the lead's ID
        const lead = await Lead.findById(id); // Finds the lead by its ID

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Respond with the customer's name and the messages array from the lead document
        res.status(200).json({
            customerName: lead.name,
            status: lead.status,
            messages: lead.messages,
        });
    } catch (error) {
        // Handle possible errors
        res.status(500).json({ error: 'Server error' });
    }
};

const sendMessege = async (req, res) => {
    const leadId = req.params.id;
    const messageText = req.body.message;

    try {
        const lead = await Lead.findById(leadId);
        if (!lead || !lead.fbSenderID) {
            return res.status(404).json({ error: 'Lead not found or missing Facebook ID' });
        }

        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page[0].pageAccessToken) {
            return res.status(500).json({ error: 'Facebook settings or access token not found' });
        }
        const { pageAccessToken, pageId } = settings.settingsData.page[0];

        // Determine the message type based on the time elapsed since the last message
        const lastMessage = lead.messages[lead.messages.length - 1];
        const timeElapsed = Date.now() - new Date(lastMessage.date).getTime();
        const messagingType = timeElapsed > 24 * 60 * 60 * 1000 ? 'UPDATE' : 'RESPONSE';

        const messagePayload = {
            recipient: { id: lead.fbSenderID },
            message: { text: messageText },
            messaging_type: messagingType,
            access_token: pageAccessToken,
        };

        const fbResponse = await axios.post(
            `https://graph.facebook.com/${pageId}/messages`,
            messagePayload
        );

        if (fbResponse.data && fbResponse.data.message_id) {
            const newMessage = {
                messageId: fbResponse.data.message_id,
                content: messageText,
                senderId: pageId,
                sentByMe: true,
                date: new Date(),
            };
            lead.messages.push(newMessage);
            const savedLead = await lead.save();

            // Emit the new message to all clients listening on the 'message' event
            req.io.emit(`fbMessage${leadId}`, newMessage);

            const socketPayload = {
                name: savedLead.name,
                lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
                lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
                sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
                createdAt: savedLead.createdAt,
                _id: savedLead._id,
            };
            req.io.emit('conversation', socketPayload);

            return res.status(200).json({ success: true, data: newMessage });
        }
        return res.status(500).json({ error: 'Failed to send message' });
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            return res.status(500).json({ error: error.response.data.error.message });
        }
        console.log(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const sendFile = async (req, res) => {
    const leadId = req.params.id;

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const lead = await Lead.findById(leadId);
        if (!lead || !lead.fbSenderID) {
            return res.status(404).json({ error: 'Lead not found or missing Facebook ID.' });
        }

        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page[0].pageAccessToken) {
            return res.status(500).json({ error: 'Facebook settings or access token not found.' });
        }
        const { pageAccessToken, pageId } = settings.settingsData.page[0];

        const newMessages = []; // Array to store new message objects

        for (const file of req.files) {
            const fileUrl = `${process.env.SERVER_URL}/images/${file.filename}`;
            const messagePayload = {
                recipient: { id: lead.fbSenderID },
                message: {
                    attachment: {
                        type: 'image',
                        payload: { url: fileUrl, is_reusable: true },
                    },
                },
                messaging_type: 'RESPONSE',
                access_token: pageAccessToken,
            };

            const fbResponse = await axios.post(
                `https://graph.facebook.com/${pageId}/messages`,
                messagePayload
            );

            if (fbResponse.data && fbResponse.data.message_id) {
                const newMessage = {
                    messageId: fbResponse.data.message_id,
                    content: 'File sent.',
                    senderId: pageId,
                    sentByMe: true,
                    date: new Date(),
                    fileUrl,
                };
                lead.messages.push(newMessage);

                // Emit the new message to all clients listening on the 'message' event
                req.io.emit(`fbMessage${leadId}`, newMessage);

                newMessages.push(newMessage); // Add the new message object to the array
            } else {
                return res.status(500).json({ error: 'Failed to send message with file.' });
            }
        }

        await lead.save(); // Save the lead document after all files have been sent

        return res.status(200).json({ success: true, data: newMessages[0] });
    } catch (error) {
        console.error('Error sending files:', error);
        return res.status(500).json({ error: error.message || 'Internal server error.' });
    }
};

const getSortedLeads = async (req, res) => {
    try {
        // Get the limit from query string, default to 10 if not provided
        const limit = parseInt(req.query.limit, 10) || 10;

        const leads = await Lead.find({})
            .sort({ 'messages.date': -1, createdAt: -1 }) // Sort by newest message date and then by lead creation date
            .limit(limit)
            .exec();

        return res.status(200).json(leads);
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// Add this function to your FbMessageController file
const getAllLeads = async (req, res) => {
    try {
        // Fetch all leads with only name and ID
        const leads = await Lead.find({}).select('name _id');

        // Return the leads
        res.status(200).json(leads);
    } catch (error) {
        // Handle possible errors
        res.status(500).json({ error: 'Server error' });
    }
};

const getLeadDetailsWithLastMessage = async (req, res) => {
    try {
        // Get the limit from query string, default to 10 if not provided

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
                    sentByMe: 1,
                    creName: 1,
                },
            },
        ]).sort({ lastMessageTime: -1 });

        res.status(200).json(leadsWithLastMessage);
    } catch (error) {
        console.error('Error getting leads with last message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Don't forget to export the new function
module.exports = {
    getAllMessage,
    sendMessege,
    sendFile,
    getSortedLeads,
    getAllLeads,
    getLeadDetailsWithLastMessage, // Add this line
};
