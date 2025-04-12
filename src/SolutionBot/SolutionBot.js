/* eslint-disable no-use-before-define */
/* eslint-disable operator-linebreak */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
const axios = require('axios');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Generate AI response using OpenAI API
const generateAIResponse = async (message) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: message }],
        });

        return response.choices[0].message.content;
    } catch (error) {
      //console.error('Error generating AI response:', error);
        return 'I’m sorry, but I’m unable to process your request at the moment.';
    }
};

// Send a message to Facebook using Graph API
const sendFacebookMessage = async (recipientId, message, pageAccessToken) => {
    try {
        const messagePayload = {
            recipient: { id: recipientId },
            messaging_type: 'RESPONSE',
            message: { text: message },
            access_token: pageAccessToken, // Include access token in the payload
        };

        const response = await axios.post(
            'https://graph.facebook.com/v17.0/me/messages',
            messagePayload
        );
        return response.data;
    } catch (error) {
      //console.error('Error sending message to Facebook:', error);
        throw error;
    }
};

// SholutionBot function to reply to a specific lead
const SholutionBot = async (leadId, io) => {
    try {
        const lead = await Lead.findById(leadId);

        if (!lead || !lead.pageInfo || !lead.pageInfo.fbSenderID || !lead.pageInfo.pageId) {
            throw new Error('Invalid lead or missing Facebook details.');
        }

        const { fbSenderID } = lead.pageInfo;
        const { pageId } = lead.pageInfo;

        // Find page access token
        const settings = await Settings.findOne({ name: 'facebook' });
        const pageSettings = settings?.settingsData?.page?.find((page) => page.pageId === pageId);

        if (!pageSettings || !pageSettings.pageAccessToken) {
            throw new Error('Page access token not found.');
        }

        const { pageAccessToken } = pageSettings;

        // Generate AI response based on the last message
        const lastMessage = lead.messages[lead.messages.length - 1]?.content || 'Hello!';
        const aiResponse = await generateAIResponse(lastMessage);

        // Send the AI-generated response to Facebook
        await sendFacebookMessage(fbSenderID, aiResponse, pageAccessToken);

        // Log the AI response in the lead’s messages
        const aiMessage = {
            messageId: `AI-${Date.now()}`,
            content: aiResponse,
            senderId: 'SholutionBot',
            sentByMe: true,
            date: new Date(),
        };

        lead.messages.push(aiMessage);
        await lead.save();

        // Emit the new message via Socket.IO
        io.emit(`fbMessage${lead._id}`, aiMessage);
      //  console.log('SholutionBot replied successfully.');
    } catch (error) {
      //console.error('Error in SholutionBot function:', error);
    }
};

module.exports = { SholutionBot };
