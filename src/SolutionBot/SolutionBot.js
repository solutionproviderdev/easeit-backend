/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
const axios = require('axios');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const Assistant = require('../schemas/settings/Assistant.Schema');
const { getIO } = require('../socket/socketService');

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- Helpers ---------- */
const pickAssistant = async () => {
    const active = await Assistant.find({ active: true });
    if (!active.length) throw new Error('No active assistant');
    return active[Math.floor(Math.random() * active.length)];
};

const ensureThread = async (message, threadId) => {
    if (threadId) {
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });
        return threadId;
    }
    const thread = await openai.beta.threads.create({
        messages: [{ role: 'user', content: message }],
    });
    return thread.id;
};

const runAssistant = async (assistantId, threadId) => {
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
    });
    let attempts = 0;
    const maxAttempts = 15;
    while (attempts < maxAttempts) {
        const status = await openai.beta.threads.runs.retrieve(threadId, run.id);
        if (status.status === 'completed') return;
        if (['failed', 'cancelled', 'expired'].includes(status.status)) {
            throw new Error(`Run ended: ${status.status}`);
        }
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;
    }
    throw new Error('Run timeout');
};

const extractReply = async (threadId) => {
    const msgs = await openai.beta.threads.messages.list(threadId);
    const last = msgs.data.reverse().find((m) => m.role === 'assistant');
    return last?.content?.[0]?.text?.value || '';
};

const generateAIResponse = async (message, assistantId, threadId) => {
    if (!assistantId) {
        const assistant = await pickAssistant();
        assistantId = assistant.id;
    } else {
        const exists = await Assistant.findOne({ id: assistantId });
        if (!exists) {
            const assistant = await pickAssistant();
            assistantId = assistant.id;
        }
    }

    threadId = await ensureThread(message, threadId);
    await runAssistant(assistantId, threadId);
    const reply = await extractReply(threadId);
    return { reply, assistantId, threadId };
};

const sendFacebookMessage = async (recipientId, message, pageAccessToken) => {
    const payload = {
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text: message },
    };
    const { data } = await axios.post(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${pageAccessToken}`,
        payload
    );
    return data;
};

/* ---------- Lead handler ---------- */
const SholutionBot = async (leadId, io, newMessage) => {
    const lead = await Lead.findById(leadId);
    if (!lead || !lead.pageInfo?.fbSenderID || !lead.pageInfo?.pageId) {
        throw new Error('Invalid lead or missing Facebook details');
    }

    const { fbSenderID, pageId } = lead.pageInfo;
    const settings = await Settings.findOne({ name: 'facebook' });
    const pageSettings = settings?.settingsData?.page?.find((p) => p.pageId === pageId);
    if (!pageSettings?.pageAccessToken) throw new Error('Page access token not found');

    const { assistantId, threadId } = lead.aiBotConfig || {};
    const {
        reply,
        assistantId: finalAssistantId,
        threadId: finalThreadId,
    } = await generateAIResponse(newMessage, assistantId, threadId);

    if (finalAssistantId !== assistantId || finalThreadId !== threadId) {
        lead.aiBotConfig = {
            assistantId: finalAssistantId,
            threadId: finalThreadId,
        };
        await lead.save();
    }

    const fbRes = await sendFacebookMessage(fbSenderID, reply, pageSettings.pageAccessToken);
    const aiMessage = {
        messageId: fbRes.message_id,
        content: reply,
        senderId: 'SholutionBot',
        sentByMe: true,
        date: new Date(),
        isAiMessage: true,
    };
    lead.messages.push(aiMessage);
    await lead.save();

    io.emit(`fbMessage${lead._id}`, aiMessage);
};

module.exports = { SholutionBot };
