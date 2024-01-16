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

module.exports = { getAllMessage, sendMessege };
