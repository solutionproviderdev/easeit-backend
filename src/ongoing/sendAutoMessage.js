/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const Lead = require('../schemas/LeadsSchema');
const { getLeadSettingsDoc } = require('../controller/settings/leadControlController');
const { sendMessageToLead } = require('../helpers/sendMessageToLead');

/**
 * Query leads that meet the auto-message criteria.
 * Only returns leads where:
 *  - status is 'New'
 *  - source is 'Facebook'
 *  - the messages array exists and is not empty
 *  - after filtering for customer-sent messages (sentByMe: false),
 *    the last message's date is between `twentyFourHoursAgo` and `delayThreshold`
 *
 * @param {Date} twentyFourHoursAgo - The Date object representing 24 hours ago.
 * @param {Date} delayThreshold - The Date object representing
 *  the delay threshold (e.g., now minus delayHours).
 * @returns {Promise<Array>} - An array of eligible leads.
 */
const getEligibleLeadsForAutoMessage = async (twentyFourHoursAgo, delayThreshold) => {
    // Aggregation pipeline
    const pipeline = [
        // Only consider leads with status 'New' and source 'Facebook',
        //  and that have at least one message.
        {
            $match: {
                status: { $in: ['New'] },
                source: { $in: ['Facebook'] },
                messages: { $exists: true, $ne: [] },
                autoMessageSentCount: { $lt: 1 },
            },
        },
        // Filter messages to keep only those not sent by the system.
        {
            $addFields: {
                filteredMessages: {
                    $filter: {
                        input: '$messages',
                        as: 'message',
                        cond: { $eq: ['$$message.sentByMe', false] },
                    },
                },
            },
        },
        // Ensure that there is at least one customer-sent message.
        {
            $match: {
                'filteredMessages.0': { $exists: true },
            },
        },
        // Add the last message from filteredMessages to a new field.
        {
            $addFields: {
                lastMessage: { $arrayElemAt: ['$filteredMessages', -1] },
            },
        },
        // Only return leads where the last message date is within the desired time window.
        {
            $match: {
                'lastMessage.date': {
                    $gte: twentyFourHoursAgo,
                    $lte: delayThreshold,
                },
            },
        },
    ];

    const eligibleLeads = await Lead.aggregate(pipeline).exec();
  //  console.log(`Found ${eligibleLeads.length} eligible leads for auto messaging.`);
    return eligibleLeads;
};

/**
 * Send Auto Message Controller
 *
 * This function retrieves the auto message settings and then queries for all leads
 * whose last message (sent by the customer) was sent more than "delayHours" ago
 * but less than 24 hours ago. For each such lead, you can trigger your auto message
 * sending logic (e.g. using a messaging API or socket).
 */
const sendAutoMessage = async (io) => {
    try {
        // Retrieve the lead control settings document (creates one if not exists)
        const settings = await getLeadSettingsDoc();
        if (!settings) {
          //console.error('Lead control settings not found');
            return;
        }

        // Extract autoMessage settings from the global settings
        const { autoMessage } = settings.settingsData.global;
        if (!autoMessage || !autoMessage.enabled) {
          //  console.log('Auto message is disabled.');
            return;
        }

        // Delay hours from settings (should be a number between 1 and 23)
        const delayHours = Number(autoMessage.delayHours);
        if (isNaN(delayHours) || delayHours < 1 || delayHours > 23) {
          //console.error('Invalid delayHours value in autoMessage settings');
            return;
        }
      //  console.log('Delay hours:', delayHours);

        // Calculate the time thresholds in milliseconds
        const now = Date.now();
        const delayThreshold = new Date(now - delayHours * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

        const leadsToAutoMessage = await getEligibleLeadsForAutoMessage(
            twentyFourHoursAgo,
            delayThreshold
        );

      //  console.log(`Found ${leadsToAutoMessage.length} leads eligible for auto messaging.`);

        // Loop over each eligible lead and send the auto message.
        // (Replace this part with your actual message sending logic.)
        for (const lead of leadsToAutoMessage) {
            // Personalize the message by replacing a placeholder with the lead's name.
            const personalizedMessage = autoMessage.message.replace('{{name}}', lead.name);
            // For example, you might call a messaging API or emit a socket event here:
            sendMessageToLead(lead._id, personalizedMessage, io);

            // save the lead
        }
    } catch (error) {
      //console.error('Error sending auto message:', error);
    }
};

module.exports = {
    sendAutoMessage,
};
