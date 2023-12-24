const axios = require('axios'); // Make sure to install axios or another HTTP client if not already done
const Lead = require('../schemas/LeadsSchema');

// Function to get the sender's name using the Graph API
async function getSendersName(senderId) {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${process.env.PAGE_ACCESS_TOKEN}`
        );

        return `${response.data.first_name} ${response.data.last_name}`;
    } catch (error) {
        console.error('Error fetching sender name:', error);
        return null;
    }
}

const addFbLead = async (req, res) => {
    const messagingEvent = req.body.entry[0].messaging[0];

    if (messagingEvent && messagingEvent.message) {
        const senderId = messagingEvent.sender.id; // The Facebook sender ID
        const message = messagingEvent.message.text;

        // Fetch the sender's name
        const senderName = await getSendersName(senderId);

        try {
            let lead = await Lead.findOne({ fbSenderID: senderId });

            if (lead) {
                // Lead exists, update the last message
                lead.lastMsg = message;
                await lead.save();
            } else {
                // Lead does not exist, create a new one
                lead = new Lead({
                    name: senderName, // Placeholder name
                    lastMsg: message,
                    fbSenderID: senderId,
                    source: 'Facebook',
                    status: 'unread', // Default status
                    creName: 'default', // Default CRE name
                    // Add other fields with default or empty values as necessary
                });

                await lead.save();
            }

            res.sendStatus(200); // Acknowledge the request
        } catch (error) {
            console.error('Error handling Facebook webhook:', error);
            res.status(500).send('Server Error');
        }
    } else {
        // If there's no message event, just acknowledge the request
        res.sendStatus(200);
    }
};

module.exports = { addFbLead };
