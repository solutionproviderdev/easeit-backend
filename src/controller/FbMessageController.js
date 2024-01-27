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
        // Retrieve the lead's Facebook ID
        const lead = await Lead.findById(leadId);
        if (!lead || !lead.fbSenderID) {
            return res.status(404).json({ error: 'Lead not found or missing Facebook ID' });
        }

        // Fetch Facebook Page Access Token from Settings
        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page[0].pageAccessToken) {
            return res.status(500).json({ error: 'Facebook settings or access token not found' });
        }
        const { pageAccessToken } = settings.settingsData.page[0];

        // Construct the message payload
        const messagePayload = {
            recipient: { id: lead.fbSenderID },
            message: { text: messageText },
            messaging_type: 'RESPONSE',
            access_token: pageAccessToken,
        };

        // Send the message via Facebook Graph API
        const fbResponse = await axios.post(
            'https://graph.facebook.com/2078095355564923/messages',
            messagePayload
        );

        // Check if the message was sent successfully and update the Lead document
        if (fbResponse.data && fbResponse.data.message_id) {
            const newMessage = {
                messageId: fbResponse.data.message_id,
                content: messageText,
                senderId: '2078095355564923', // Your Facebook Page ID
                sentByMe: true,
                date: new Date(),
            };

            lead.messages.push(newMessage);
            await lead.save();

            return res.status(200).json({ success: true, data: fbResponse.data });
        }
        return res.status(500).json({ error: 'Failed to send message' });
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            // If the error is from Facebook API
            return res.status(500).json({ error: error.response.data.error.message });
        }
        // Other errors
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const sendFile = async (req, res) => {
    const leadId = req.params.id;

    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        // Retrieve the lead's Facebook ID
        const lead = await Lead.findById(leadId);
        if (!lead || !lead.fbSenderID) {
            return res.status(404).json({ error: 'Lead not found or missing Facebook ID.' });
        }

        // Fetch Facebook Page Access Token from Settings
        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page[0].pageAccessToken) {
            return res.status(500).json({ error: 'Facebook settings or access token not found.' });
        }
        const { pageAccessToken, pageId } = settings.settingsData.page[0];

        // Loop through each file and send it
        const fbResponses = [];
        for (const file of req.files) {
            const fileUrl = `${process.env.SERVER_URL}/images/${file.filename}`;

            const messagePayload = {
                recipient: {
                    id: lead.fbSenderID,
                },
                message: {
                    attachment: {
                        type: 'image',
                        payload: {
                            url: fileUrl,
                            is_reusable: true,
                        },
                    },
                },
                messaging_type: 'RESPONSE',
                access_token: pageAccessToken,
            };

            const fbResponse = await axios.post(
                `https://graph.facebook.com/${pageId}/messages`,
                messagePayload
            );
            fbResponses.push(fbResponse.data);

            // If the message was sent successfully, add details to the lead document
            if (fbResponse.data && fbResponse.data.message_id) {
                lead.messages.push({
                    messageId: fbResponse.data.message_id,
                    content: 'File sent.',
                    senderId: pageId,
                    sentByMe: true,
                    date: new Date(),
                    fileUrl,
                });
            } else {
                return res.status(500).json({ error: 'Failed to send message with file.' });
            }
        }

        // Save the lead document after all files have been sent
        await lead.save();

        // Respond with the details of the messages sent
        return res.status(200).json({ success: true, data: fbResponses });
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
            .populate('messages') // Optional: Populate messages if needed
            .sort({ 'messages.date': -1, createdAt: -1 }) // Sort by newest message date and then by lead creation date
            .limit(limit) // Limit the number of leads
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

// Don't forget to export the function
module.exports = {
    getAllMessage,
    sendMessege,
    sendFile,
    getSortedLeads,
    getAllLeads,
};
