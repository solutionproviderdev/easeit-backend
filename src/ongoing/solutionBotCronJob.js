/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
const Lead = require('../schemas/LeadsSchema');
const { SholutionBot } = require('../SolutionBot/SolutionBot');
const { logger } = require('../config/winston');

/**
 * Process leads that need AI bot responses
 * @param {Object} io - Socket.io instance for real-time updates
 */
const processLeadsForAIResponse = async io => {
	try {
		// Find leads with aiBotReply enabled and where the last message is from the customer
		const leads = await Lead.find({
			aiBotReply: true, // has ai bot enabled
			lastCustomerMessageTime: {
				$gt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			}, // last 24 hours
			messagesSeen: false, // has unseen messages
			lastMessageSentFromUs: false,
		})
			.select('_id messages pageInfo')
			.lean();

		logger.info(`Processing ${leads.length} leads for AI responses`);

		// console.log('processLeadsForAIResponse-------------------------',leads);
		for (const lead of leads) {
			try {
				const hasmultipleMessage = false;
				const custommerMessage = '';

				// Skip if no messages
				if (!lead.messages || lead.messages.length === 0) continue;

				// Get the last message
				const lastMessage = lead.messages[lead.messages.length - 1];

				// Skip if the last message is from us or contains file attachments
				if (
					lastMessage.sentByMe ||
					(lastMessage.fileTypes && lastMessage.fileTypes.length > 0)
				) {
					continue;
				}

				// if custommer has multiple

				// Process the lead with SholutionBot
				await SholutionBot(lead._id, io, lastMessage.content);

				// Add a small delay to prevent rate limiting
				await new Promise(resolve => setTimeout(resolve, 500));
			} catch (error) {
				console.log(
					'processLeadsForAIResponse lead catch error ------------------',
					error
				);
				logger.error('Error processing lead for AI response', {
					leadId: lead._id,
					error: error.message,
				});
			}
		}
	} catch (error) {
		console.log('processLeadsForAIResponse error------------------', error);
		logger.error('Error in processLeadsForAIResponse', {
			error: error.message,
			stack: error.stack,
		});
	}
};

module.exports = {
	processLeadsForAIResponse,
};
