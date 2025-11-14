/* eslint-disable no-use-before-define */
/* eslint-disable operator-linebreak */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */

const axios = require('axios');
const moment = require('moment');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const People = require('../schemas/PeopleSchema');
const { isAutomatedMessage } = require('../helpers/isAutomatedMessage');
const { getPerformanceBasedCRE } = require('../helpers/getPerformanceBasedCRE');
const User = require('../schemas/auth/UserSchema');
const { notifyNewLeadAssignment } = require('../helpers/notification/lead/leadTriggers');
const { metaDeletedMessageAllart } = require('./metaDeletedMessageAllart');
const { SholutionBot } = require('../SolutionBot/SolutionBot');
const MediaReplySettings = require('../schemas/settings/MediaReplySettingsSchema');
const { sendMessageToLead } = require('../helpers/sendMessageToLead');
const { MediaBot } = require('../MediaBot/MediaBot');
const { emitLeadMessage, emitConversationUpdate } = require('../utils/socketEmitter');
const {
    processConversation,
    emitSocketEventsForNewMessage,
    getCreInfo,
} = require('../helpers/facebookConversations');

/**
 * Converts Bengali numerals in a string to English numerals.
 * @param {string} input - The input string possibly containing Bengali numbers.
 * @returns {string} - The input string with Bengali numerals replaced by English.
 */
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

/**
 * Extracts and validates a phone number from a given content string.
 * @param {string} content - The message content to search within.
 * @param {string} countryCode - The default country code for validation (default 'BD').
 * @returns {Object|null} - Returns a parsed phone number object if valid; otherwise null.
 */
const extractValidPhoneNumber = (content, countryCode = 'BD') => {
    // First, convert any Bengali numerals to English.
    const sanitizedContent = convertBengaliToEnglishNumbers(
        content.replace(/[^0-9০১২৩৪৫৬৭৮৯]+/g, '')
    );

    // Validate and parse the phone number using libphonenumber-js.
    if (sanitizedContent) {
        const parsedNumber = parsePhoneNumberFromString(sanitizedContent, countryCode);
        if (parsedNumber && parsedNumber.isValid()) {
            return parsedNumber;
        }
    }
    return null;
};

/**
 * Removed number extraction utilities; handled by dedicated cron
 * in src/cron/detectCollectedNumbers.js
 * @param {Array} messages - Array of message objects.
 * @returns {Object} - Contains the processed messages and metadata.
 */
const processMessages = (messages) => {
    let lastCustomerMessageTime = null;

    const lastMessage = messages[messages.length - 1];
    const lastMessageSentFromUs = lastMessage.from.name === 'Solution Provider';

    // Map each message to a standardized format.
    const processedMessages = messages.map((msg) => {
        let fileUrl = [];
        /* Added to handle file types */
        const fileTypes = [];
        // ______________________________
        // If the sender is not "Solution Provider", track last customer message time.
        if (msg.from.name !== 'Solution Provider') {
            const content = msg.message || '';
            // Number extraction removed from ingestion; cron handles it.
            lastCustomerMessageTime = msg.created_time;
        }

        // If the message has attachments, extract URLs from them.
        if (
            msg?.attachments &&
            msg?.attachments?.data?.length > 0 &&
            (msg?.attachments?.data[0]?.image_data ||
                msg?.attachments?.data[0]?.video_data ||
                msg?.attachments?.data[0]?.file_url)
        ) {
            // Determine the file type based on the attachment data.
            const attachment = msg.attachments.data[0];
            if (attachment.image_data) fileTypes.push('image');
            else if (attachment.video_data) fileTypes.push('video');
            else if (
                attachment.file_url &&
                attachment.mime_type &&
                attachment.mime_type.startsWith('audio')
            ) {
                fileTypes.push('audio');
            }
            // _____________________________________________________________

            fileUrl = msg?.attachments?.data?.map((attachmentItem) => {
                if (attachmentItem.image_data) {
                    return attachmentItem.image_data.url;
                }
                if (attachmentItem.video_data) {
                    return attachmentItem.video_data.url;
                }
                if (attachmentItem.file_url) {
                    return attachmentItem.file_url;
                }
                return [];
            });
        }

        // Return a standardized message object.
        return {
            messageId: msg.id,
            content: msg.message,
            isAutomatedMessage: isAutomatedMessage(msg.message),
            senderId: msg.from.id,
            senderName: msg.from.name,
            sentByMe: msg.from.name === 'Solution Provider',
            date: moment(msg.created_time).format('LLL'),
            fileUrl,
            fileTypes, // array of types
        };
    });

    return {
        processedMessages,
        lastMessageSentFromUs,
        lastCustomerMessageTime,
    };
};

/**
 * Logs an error with a custom message, the error object, and additional data if provided.
 * @param {string} message - Custom message describing the error context.
 * @param {Error} error - The error object.
 * @param {any} data - Additional data to log.
 */
const logError = (message, error, data) => {
    console.error(`${message}: ${error}`);
    const currentTime = new Date().toLocaleString();
    console.error(`${currentTime} => ${message}`);
    if (data) {
        console.error('Additional data:', data);
    }
};

/**
 * Fetches Facebook settings (pages) from the database.
 * @returns {Array} - An array of Facebook page settings.
 * @throws Will throw an error if settings or page data are not found.
 */
const fetchFacebookSettings = async () => {
    const fbSettings = await Settings.findOne({ name: 'facebook' });
    if (!fbSettings || !fbSettings.settingsData.page) {
        throw new Error('Facebook settings or access tokens not found');
    }
    return fbSettings.settingsData.page;
};

/**
 * Creates a mapping of CRE names (using the last name) to their IDs.
 * @returns {Object} - An object where keys are CRE last names
 *  and values are their corresponding IDs.
 */
const getCREMapping = async () => {
    const cres = await People.find({ role: 'CRE' });
    return cres.reduce((map, cre) => {
        const lastName = cre.name.split(' ').pop();
        map[lastName] = cre._id;
        return map;
    }, {});
};

/**
 * Fetches conversations from the Facebook Graph API for a given page.
 * @param {string} pageId - Facebook Page ID.
 * @param {string} pageAccessToken - Access token for the Facebook Page.
 * @returns {Array} - Array of conversation objects.
 */
const fetchConversationsFromFacebook = async (pageId, pageAccessToken) => {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,created_time,attachments{image_data,video_data,generic_template,mime_type,size,name,file_url,id},from}&limit=${process.env.LIMIT}&access_token=${pageAccessToken}`
        );
        return response.data.data;
    } catch (error) {
        // logError(`Error fetching data for page ${pageId}`, error);
        return [];
    }
};

/**
 * Main function to fetch Facebook conversations and update lead data.
 * Iterates over all Facebook pages, retrieves conversations, processes them,
 * and updates or creates leads accordingly.
 * @param {Object} io - Socket.io instance.
 */
const getConversationsAndUpdateLeadsUpdated = async (io) => {
    // console.time('getConversationsAndUpdateLeadsUpdated');
    try {
        const pages = await fetchFacebookSettings();
        const nameToCreId = await getCREMapping();

        for (const page of pages) {
            const pageInfo = {
                pageAccessToken: page.pageAccessToken,
                pageId: page.pageId,
                pageName: page.name,
                pageProfilePicture: page.picture,
            };

            const conversations = await fetchConversationsFromFacebook(
                page.pageId,
                page.pageAccessToken
            );

            for (const conversation of conversations) {
                await processConversation(conversation, nameToCreId, io, pageInfo);
            }
        }
    } catch (error) {
        logError('Error fetching or processing data', error);
    }
    // console.timeEnd('getConversationsAndUpdateLeadsUpdated');
};

module.exports = {
    getConversationsAndUpdateLeadsUpdated,
    emitSocketEventsForNewMessage,
    getCreInfo,
};
