/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const path = require('path');
const Lead = require('../schemas/LeadsSchema');

/**
 * Finds leads containing the exact message text inside their messages array.
 * Saves the formatted results to a JSON file in the logs directory.
 * @param {string} messageText - The exact message content to find.
 * @returns {Promise<Array>} - Array of matched leads with the specific message.
 */
async function getSpecificMessageLog(messageText) {
    try {
        const leads = await Lead.find({
            messages: {
                $elemMatch: {
                    content: messageText,
                },
            },
        }).select({
            _id: 1,
            name: 1,
            CID: 1,
            'messages.$': 1, // Only return the matched message
        });

        const formatedLeads = [];

        for (const lead of leads) {
            const message = lead.messages[0];
            formatedLeads.push({
                name: lead.name,
                CID: lead.CID,
                message: message.content,
                timestamp: message.date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }),
            });
        }

        // Define output path
        const logsDir = path.join(__dirname, '../../logs');
        const outputPath = path.join(logsDir, 'specific-message-log.json');

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Write to file
        fs.writeFileSync(outputPath, JSON.stringify(formatedLeads, null, 2), 'utf-8');
        console.log(`✅ Saved ${formatedLeads.length} records to ${outputPath}`);

        return formatedLeads;
    } catch (error) {
        console.error('❌ Error fetching message log:', error);
        throw error;
    }
}

module.exports = {
    getSpecificMessageLog,
};
