/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
const axios = require('axios');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const Assistant = require('../schemas/settings/Assistant.Schema');
const { getIO } = require('../socket/socketService');
const { logger } = require('../config/winston');
const { emitLeadMessage } = require('../utils/socketEmitter');

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- Helpers ---------- */
const pickAssistant = async () => {
	// need to find the assistant id from the settings not from Assistance collection
	const active = await Assistant.find({ active: true });
	if (!active.length) {
		logger.error('No active assistant found');
		throw new Error('No active assistant');
	}
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
	const maxAttempts = 15;
	// Using a for loop instead of while loop with ++ operator
	for (let attempts = 0; attempts < maxAttempts; attempts += 1) {
		// eslint-disable-next-line no-await-in-loop
		const status = await openai.beta.threads.runs.retrieve(threadId, run.id);
		if (status.status === 'completed') return;
		if (['failed', 'cancelled', 'expired'].includes(status.status)) {
			logger.error(`Run ended with status: ${status.status}`);
			throw new Error(`Run ended: ${status.status}`);
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise(resolve => {
			setTimeout(resolve, 1000);
		});
	}
	logger.error(`Run timed out after ${maxAttempts} attempts`);
	throw new Error('Run timeout');
};

const extractReply = async threadId => {
	const msgs = await openai.beta.threads.messages.list(threadId);

	// console.log('All messages from the thread:', msgs);

	const first = msgs.data.find(m => m.role === 'assistant');

	const reply = first?.content?.[0]?.text?.value || '';

	if (!reply) {
		logger.warn(`No assistant reply found in thread: ${threadId}`);
	}

	return reply;
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

	try {
		await runAssistant(assistantId, threadId);
		const reply = await extractReply(threadId);
		return { reply, assistantId, threadId };
	} catch (error) {
		logger.error('Error generating AI response', {
			error: error.message,
			assistantId,
			threadId,
		});
		// Instead of throwing, return a fallback response to prevent server crash
		return {
			reply:
				"I'm sorry, I couldn't process your request at the moment. Please try again later.",
			assistantId,
			threadId,
		};
	}
};

const sendFacebookMessage = async (recipientId, message, pageAccessToken) => {
	const payload = {
		recipient: { id: recipientId },
		messaging_type: 'RESPONSE',
		message: { text: message },
	};

	try {
		const { data } = await axios.post(
			`https://graph.facebook.com/v17.0/me/messages?access_token=${pageAccessToken}`,
			payload
		);
		return data;
	} catch (error) {
		logger.error('Error sending Facebook message', {
			error: error.message,
			recipientId,
			statusCode: error.response?.status,
		});
		// Return empty object instead of throwing to prevent server crash
		return {};
	}
};

/* ---------- Lead handler ---------- */
const SholutionBot = async (leadId, io, newMessage) => {
	console.log(
		'SholutionBot leadId and newMessage------------------',
		leadId,
		newMessage
	);
	try {
		const lead = await Lead.findById(leadId);
		if (!lead || !lead.pageInfo?.fbSenderID || !lead.pageInfo?.pageId) {
			logger.error('Invalid lead or missing Facebook details', { leadId });
			return; // Return instead of throwing to prevent server crash
		}

		const { fbSenderID, pageId } = lead.pageInfo;

		const settings = await Settings.findOne({ name: 'facebook' });
		console.log('ai settings for automessage------------------', settings);
		const pageSettings = settings?.settingsData?.page?.find(
			p => p.pageId === pageId
		);
		console.log(
			'ai pageSettings for automessage------------------',
			pageSettings
		);
		if (!pageSettings?.pageAccessToken) {
			logger.error('Page access token not found', { pageId });
			return; // Return instead of throwing to prevent server crash
		}

		const { assistantId, threadId } = lead.aiBotConfig || {};
		console.log(
			'ai assistantId and threadId for automessage------------------',
			assistantId,
			threadId
		);
		const {
			reply,
			assistantId: finalAssistantId,
			threadId: finalThreadId,
		} = await generateAIResponse(newMessage, assistantId, threadId);

		console.log('Final reply From AI', reply);
		if (!reply || !reply.trim() || reply.toLowerCase().includes('sorry')) {
			logger.warn('Refusal or empty reply detected – message discarded');
			return; // do NOT send anything
		}
		let replyText = reply?.trim();
		if (!replyText) {
			replyText =
				'আসসালামু আলাইকুম। আপনার বার্তাটি পেয়েছি, আমাদের এক্সপার্ট টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।';
		}

		if (finalAssistantId !== assistantId || finalThreadId !== threadId) {
			lead.aiBotConfig = {
				assistantId: finalAssistantId,
				threadId: finalThreadId,
			};
			lead.messagesSeen = true;
			lead.lastMessageSentFromUs = true;
			await lead.save();
		}

		const fbRes = await sendFacebookMessage(
			fbSenderID,
			replyText, //reply
			pageSettings.pageAccessToken
		);
		console.log('ai send message :---------------->', fbRes);
		if (!fbRes.message_id) {
			logger.error('Failed to get message_id from Facebook response');
			// Continue execution even if we don't have a message_id
		}

		const aiMessage = {
			messageId: fbRes.message_id || `temp-${Date.now()}`,
			content: replyText, //reply
			senderId: 'SholutionBot',
			sentByMe: true,
			date: new Date(),
			isAiMessage: true,
		};

		lead.messages.push(aiMessage);
		await lead.save();

		// Emit the new message via Socket.IO using the centralized function
		emitLeadMessage({ io, leadId: lead._id, message: aiMessage });

		return { success: true, messageId: fbRes.message_id };
	} catch (error) {
		logger.error('Error in SholutionBot', {
			error: error.message,
			stack: error.stack,
			leadId,
		});
		// Don't throw the error, just log it to prevent server crash
	}
};

module.exports = { SholutionBot };
