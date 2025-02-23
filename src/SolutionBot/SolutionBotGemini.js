/* eslint-disable no-use-before-define */
/* eslint-disable operator-linebreak */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Generate AI response using Google Generative AI
const generateAIResponse = async (message, name, phoneNumber, previousMessages) => {
    try {
        const prompt = `
            You are an AI assistant representing Solution Provider, a leading interior design and manufacturing company. Your task is to respond professionally, concisely (strictly under 150 characters), and helpfully to customer inquiries. Ensure your response is unique and does not repeat information or patterns used in previous replies within the conversation. Use "Sir/Ma'am" based on the gender inferred from the provided name when appropriate. If a phone number is already provided, do not ask for it again.

            **Language Instructions:**
            1. Respond in Bangla by default unless the customer’s message is in English. 
            2. Convert phone numbers in replies to Bangla numerals if they are provided in English numerals.

            **Allowed Greetings:**
            Use only the following greetings:
            1. আসসালামু আলাইকুম (Assalamu Alaikum) - Islamic greeting meaning "Peace be upon you." [Don't use if you are not sure of the customer's religion.]
            2. সুপ্রভাত (Supravat) - Good morning.
            3. শুভ অপরাহ্ন (Shuvo Oporanno) - Good afternoon.
            4. শুভ সন্ধ্যা (Shuvo Shondhya) - Good evening.
            5. Hello (হ্যালো) - Greeting.
            6. Hi (হাই) - Greeting.

            **Business Information:**
            - **Business Name**: Solution Provider
            - **Hotline**: +880 1949-654499
            - **Email**: info@solutionprovider.com.bd
            - **Address**: 113/B Love Road, Tejgaon Industrial Area, Dhaka, 1208

            **Services Offered:**
            1. **Kitchen Cabinet Design**: Modular and durable designs with affordable pricing.
            2. **Wall Ceilings and TV Units**: Modern, sleek, and tailored designs to enhance living spaces.
            3. **Customized Interior Solutions**: Personalized designs blending aesthetics and functionality.

            **Business Processes:**
            1. **Lead Generation**:
               - Leads are collected through Facebook marketing campaigns.
               - Customer Relationship Executives (CREs) follow up to gather project details and schedule meetings.

            2. **Sales Process**:
               - Meetings are scheduled with clients to take measurements, discuss designs, and provide quotations.
               - A budget is proposed, and an initial payment is collected upon confirmation.

            3. **Project Implementation**:
               - Final measurements are taken, and products are crafted in-house using high-quality materials.
               - Products are delivered and installed at the client’s location.

            **Guidelines for Responses:**
            1. Always provide concise, professional replies (≤150 characters).
            2. Greet with "Sir/Ma'am" based on inferred gender from the provided name.
            3. Avoid asking for a phone number if it is included in the customer's input.
            4. Convert phone numbers in replies to Bangla numerals if they are provided in English numerals.
            5. Focus on providing specific, relevant assistance based on the customer’s query.
            6. Review the "Previous Messages" section and ensure your response adds new, helpful information.
            7. Avoid repeating the same type of response from earlier in the conversation. Offer new insights or details to keep the conversation engaging and valuable.
            8. Adapt your tone and content dynamically based on the context of the conversation.
            9. If a customer asks for a specific product or service, provide details about it.
            10. dont give greetings in every single message, if previous messages has greeting on it, dont give greetings again.

            **Conversation Context and History:**
            - Previous messages contain the full context of the ongoing conversation to avoid repetition. Review this section carefully:
            ${previousMessages}

            **Customer Input:**
            - Name: ${name}
            - Custommers Phone: ${phoneNumber}
            - Message: ${message}

            **Your Task:**
            - Analyze the input and context.
            - Provide a unique response that enhances the conversation and avoids redundancy.

            **Your Response:**
            `;

        const response = await model.generateContent([prompt]);
        const aiResponse = response.response.text();

        // Enforce additional safeguard in case the model exceeds the limit
        return aiResponse.slice(0, 2000);
    } catch (error) {
        console.error('Error generating AI response:', error);
        return 'I’m sorry, but I’m unable to process your request at the moment.';
    }
};

// Send a message to Facebook using Graph API
const sendFacebookMessage = async (recipientId, message, pageAccessToken) => {
    try {
        // Ensure message length does not exceed 2000 characters
        const maxLength = 2000;
        let finalMessage = message;

        if (message.length > maxLength) {
            finalMessage = `${message.substring(0, maxLength - 20)}... [Message truncated]`;
        }

        const messagePayload = {
            recipient: { id: recipientId },
            messaging_type: 'RESPONSE',
            message: { text: finalMessage },
            access_token: pageAccessToken, // Include access token in the payload
        };

        const response = await axios.post(
            'https://graph.facebook.com/v17.0/me/messages',
            messagePayload
        );

        return response.data;
    } catch (error) {
        console.error('Error sending message to Facebook:', error.response?.data || error.message);
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

        // Get the last message
        const lastMessage = lead.messages[lead.messages.length - 1];
        const lastAIResponse =
            lead.messages.reverse().find((msg) => msg.isAiMessage)?.content || '';

        // Skip if the message is not sent by "me" or is already an AI message
        if (lastMessage?.sentByMe || lastMessage?.isAiMessage) {
            console.log(
                'Skipping message processing as it is either sent by me or is an AI message.'
            );
            return;
        }

        // Prepare previous messages
        const previousMessages = lead.messages
            .slice(-10) // Limit to the last 10 messages for context
            .map((msg) => `${msg.sentByMe ? 'ME' : 'Customer'}: "${msg.content}"`)
            .join('\n');

        // Generate AI response based on the last valid message
        const aiResponse = await generateAIResponse(
            lastMessage?.content || 'Hello!',
            lead.name,
            lead.phone[0],
            previousMessages,
            lastAIResponse
        );

        // Ensure the response is unique
        if (aiResponse.trim() === lastAIResponse.trim()) {
            console.log('AI response is too similar to the last one, skipping...');
            return;
        }

        // Send the AI-generated response to Facebook
        await sendFacebookMessage(fbSenderID, aiResponse, pageAccessToken);

        // Log the AI response in the lead’s messages
        const aiMessage = {
            messageId: `AI-${Date.now()}`,
            content: aiResponse,
            senderId: 'SholutionBot',
            sentByMe: true,
            isAiMessage: true, // Mark as AI-generated
            date: new Date(),
        };

        lead.messages.push(aiMessage);
        await lead.save();

        // Emit the new message via Socket.IO
        io.emit(`fbMessage${lead._id}`, aiMessage);
        console.log('SholutionBot replied successfully.');
    } catch (error) {
        console.error('Error in SholutionBot function:', error);
    }
};

module.exports = { SholutionBot };
