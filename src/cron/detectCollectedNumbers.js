/* eslint-disable no-continue */
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('../schemas/LeadsSchema');
const { notifyNumberCollected } = require('../helpers/notification/lead/numberCollectedTriggers');

// Utility: convert Bengali numerals to English
const convertBengaliToEnglishNumbers = (input) => {
    const bengaliToEnglishMap = {
        '০': '0',
        '১': '1',
        '২': '2',
        '৩': '3',
        '৪': '4',
        '৫': '5',
        '৬': '6',
        '৭': '7',
        '৮': '8',
        '৯': '9',
    };
    return input.replace(/[০১২৩৪৫৬৭৮৯]/g, (match) => bengaliToEnglishMap[match]);
};

// Extract and validate a phone number using the same logic as conversation ingestion
const extractValidPhoneNumber = (content, countryCode = 'BD') => {
    const sanitizedContent = convertBengaliToEnglishNumbers(
        (content || '').replace(/[^0-9০১২৩৪৫৬৭৮৯]+/g, '')
    );
    if (sanitizedContent) {
        const parsedNumber = parsePhoneNumberFromString(sanitizedContent, countryCode);
        if (parsedNumber && parsedNumber.isValid()) {
            return parsedNumber;
        }
    }
    return null;
};

// Cron task: detect numbers in leads with status "New", update status, and notify CRE
const detectAndUpdateCollectedNumbers = async (io) => {
    try {
        let updatedCount = 0;
        const cursor = Lead.find({ status: 'New' }).cursor();
        // Stream through leads to avoid memory spikes
        // eslint-disable-next-line no-restricted-syntax
        for await (const lead of cursor) {
            try {
                if (!lead?.messages || lead.messages.length === 0) continue;

                let collected = null;
                // eslint-disable-next-line no-restricted-syntax
                for (const msg of lead.messages) {
                    if (msg?.sentByMe) continue;
                    const content = msg?.content || msg?.message || '';
                    const parsed = extractValidPhoneNumber(content, 'BD');
                    if (parsed?.number && parsed.number.length === 14) {
                        collected = parsed.number;
                        break;
                    }
                }

                if (!collected) continue;

                // Update phone list and status
                if (!Array.isArray(lead.phone)) lead.phone = [];
                if (!lead.phone.includes(collected)) {
                    lead.phone.push(collected);
                }
                if (lead.status === 'New') {
                    lead.status = 'Number Provided';
                }

                await lead.save();

                // Notify CRE about the collected number
                const creId = lead?.creName?._id || lead?.creName;
                if (creId) {
                    try {
                        await notifyNumberCollected(lead._id, creId, collected);
                    } catch (notifyErr) {
                        console.error('Error notifying number collected:', notifyErr);
                    }
                }

                updatedCount += 1;
            } catch (leadErr) {
                console.error('Error processing lead in number collection job:', leadErr);
            }
        }
        console.log(`Number collection cron finished. Updated leads: ${updatedCount}`);
    } catch (error) {
        console.error('Error in detectAndUpdateCollectedNumbers:', error);
    }
};

module.exports = { detectAndUpdateCollectedNumbers };