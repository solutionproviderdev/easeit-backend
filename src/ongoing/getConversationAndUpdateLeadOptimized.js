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
const SavedMessage = require('../schemas/settings/SavedMessage.Schema');
const Assistant = require('../schemas/settings/Assistant.Schema');
const { sendMessageToLead } = require('../helpers/sendMessageToLead');

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
 * Processes an array of messages and returns both the
 * processed messages and any valid phone number found.
 * @param {Array} messages - Array of message objects.
 * @returns {Object} - Contains the processed messages and the extracted phone number.
 */
const processMessages = (messages) => {
    let phoneNumber = '';

    const lastMessage = messages[messages.length - 1];
    const lastMessageSentFromUs = lastMessage.from.name === 'Solution Provider';

    // Map each message to a standardized format.
    const processedMessages = messages.map((msg) => {
        let fileUrl = [];
        /* Added to handle file types */
        let fileType = null;
        // ______________________________
        // If the sender is not "Solution Provider", try to extract a phone number.
        if (msg.from.name !== 'Solution Provider') {
            const content = msg.message || '';
            const extractedNumber = extractValidPhoneNumber(content, 'BD');
            if (extractedNumber) {
                phoneNumber = extractedNumber; // Update phoneNumber if a valid one is found.
            }
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
            const att = msg.attachments.data[0];
            if (att.image_data) fileType = 'image';
            else if (att.video_data) fileType = 'video';
            else if (att.file_url && att.mime_type && att.mime_type.startsWith('audio')) fileType = 'audio';
            // _____________________________________________________________

            fileUrl = msg?.attachments?.data?.map((att) => {
                if (att.image_data) {
                    return att.image_data.url;
                }
                if (att.video_data) {
                    return att.video_data.url;
                }
                if (att.file_url) {
                    return att.file_url;
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
            fileType,
        };
    });

    return { processedMessages, phoneNumber, lastMessageSentFromUs };
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
        logError(`Error fetching data for page ${pageId}`, error);
        return [];
    }
};

/**
 * Processes a single conversation from Facebook:
 * - Extracts participant and message information.
 * - Processes messages.
 * - Finds or creates a lead based on Facebook sender ID.
 * - Updates an existing lead with new messages or creates a new lead.
 * - Emits socket events with updated lead information.
 * @param {Object} conversation - Conversation object from Facebook.
 * @param {Object} nameToCreId - Mapping of CRE names to their IDs.
 * @param {Object} io - Socket.io instance.
 * @param {Object} pageInfo - Facebook page information.
 */
const processConversation = async (conversation, nameToCreId, io, pageInfo) => {
    try {
        // Find the participant that is not the Facebook page itself.
        const otherParticipant = conversation.participants.data.find(
            (p) => p.name !== pageInfo.name
        );
        const fbSenderID = otherParticipant.id;
        // Process the messages from the conversation.
        const { processedMessages, phoneNumber, lastMessageSentFromUs } = processMessages(
            [...(conversation?.messages?.data ?? [])].reverse()
        );
        // Try to find an existing lead using the Facebook sender ID.
        let lead = await Lead.findOne({ 'pageInfo.fbSenderID': fbSenderID });

        // check for meta convesation Delete
        metaDeletedMessageAllart(conversation?.messages?.data, lead, io);

        // If lead exists, update it with new messages.
        if (lead) {
            await updateExistingLead(
                lead,
                processedMessages,
                phoneNumber,
                nameToCreId,
                io,
                pageInfo,
                lastMessageSentFromUs
            );
        } else {
            // If no lead exists, create a new lead.
            lead = await createNewLead(
                otherParticipant,
                processedMessages,
                pageInfo,
                io,
                lastMessageSentFromUs
            );
        }

        // Optionally, trigger the SholutionBot for specific leads.
        // await SholutionBot(lead._id, io);

        await lead.save(); // Ensure the lead document is saved.
    } catch (error) {
        logError('Error processing a single conversation', error);
    }
};

/**
 * Updates an existing lead with new messages and updates its status if needed.
 * - Adds new messages if not already present.
 * - Updates the lead's last message and CRE assignment.
 * - Emits socket events with the updated lead.
 * @param {Object} lead - The lead document.
 * @param {Array} processedMessages - Array of processed messages.
 * @param {Object} phoneNumber - Extracted phone number data.
 * @param {Object} nameToCreId - Mapping of CRE names to their IDs.
 * @param {Object} io - Socket.io instance.
 * @param {Object} pageInfo - Facebook page information.
 */
const updateExistingLead = async (
    lead,
    processedMessages,
    phoneNumber,
    nameToCreId,
    io,
    pageInfo,
    lastMessageSentFromUs
) => {
    let isNewMessageAdded = false;
    let newCreId = lead.creName;
    // let isNewMessagesFromUs = false;

    let newMessage;

    // Loop through each processed message.
    for (const message of processedMessages) {
        // If the message is not already in the lead's messages array.
        if (!lead.messages.find((m) => m.messageId === message.messageId)) {
            lead.messages.push(message);
            newMessage = message.content;

            /** *    What  I have added here to action the media type Reply */

            // --- Media auto-reply trigger ---
            if (message.fileType && !message.sentByMe) {
                // Log the file detection for debugging purposes.
                console.log('[AUTO-REPLY TRIGGER] File detected:', {
                    fileType: message.fileType,
                    fileUrl: message.fileUrl,
                    leadId: lead._id,
                    senderName: message.senderName,
                    messageId: message.messageId,
                });
                // 1. Get the lead owner (or org/user as needed)

                // 2. Fetch media reply settings
                const settings = await MediaReplySettings.findOne({})
                    .populate(`${message.fileType}.savedId`)
                    .populate(`${message.fileType}.aiModel`)
                    .lean();
                console.log('[AUTO-REPLY] Settings found:', settings);
                if (settings && settings[message.fileType]?.enabled) {
                    console.log(`[AUTO-REPLY] ${message.fileType} reply enabled`);

                    let replyText = null;

                    if (
                        settings[message.fileType].aiEnabled &&
                        settings[message.fileType].aiModel
                    ) {
                        console.log('[AUTO-REPLY] AI enabled, generating reply...');
                        replyText = await getAIResponse(
                            settings[message.fileType].aiModel,
                            message
                        );
                    } else if (
                        settings[message.fileType].savedMessageEnabled &&
                        settings[message.fileType].savedId
                    ) {
                        console.log('[AUTO-REPLY] Saved message enabled, using saved message...');
                        replyText = settings[message.fileType].savedId.message;
                    }

                    console.log('[AUTO-REPLY] Reply text:', replyText);

                    if (replyText) {
                        console.log('[AUTO-REPLY] Sending reply...');
                        await sendMessageToLead(lead._id, replyText, io);
                    }
                }
            }
            // --- end media type auto-reply trigger ---

            if (lead.aiBotReply && !lastMessageSentFromUs) {
                SholutionBot(lead._id, io, newMessage);
            }
            // // Determine if the message is from a user (not from the Facebook page).
            // Set messagesSeen based on whether the message is from us.
            // Check if the message content includes any known CRE names to update assignment.
            Object.entries(nameToCreId).forEach(([name, id]) => {
                if (message.content.includes(name)) {
                    newCreId = id;
                }
            });
            // Emit a socket event for the new message.
            io.emit(`fbMessage${lead._id}`, message);
            isNewMessageAdded = true;
        }
    }

    if (isNewMessageAdded) {
        // Update the lead's last message and assign the new CRE if applicable.
        lead.lastMsg = processedMessages[processedMessages.length - 1].content;
        lead.creName = newCreId;
        lead.messagesSeen = lastMessageSentFromUs;
        lead.repliedFromSystem = true;

        // If a valid phone number was extracted, update the lead's phone numbers.
        if (phoneNumber?.number?.length === 14) {
            const formattedPhoneNumber = phoneNumber.number;
            if (!lead.phone.includes(formattedPhoneNumber)) {
                lead.phone.push(formattedPhoneNumber);
            }
        }

        // If lead status is not "New", update status to
        //  "Number Collected" if a phone was collected.
        if (phoneNumber?.number?.length === 14 && lead.status === 'New') {
            lead.status = 'Number Provided';
        }

        const savedLead = await lead.save();
        // Emit socket events with updated lead information.
        emitSocketEventsForNewMessage(io, savedLead, pageInfo);
    }
};

/**
 * Creates a new lead document from conversation data.
 * @param {Object} otherParticipant - The participant object (not the Facebook page).
 * @param {Array} processedMessages - Array of processed messages.
 * @param {Object} pageInfo - Facebook page information.
 * @param {Object} io - Socket.io instance.
 * @returns {Object} - The newly created lead document.
 */
const createNewLead = async (
    otherParticipant,
    processedMessages,
    pageInfo,
    io,
    lastMessageSentFromUs
) => {
    // Get the best-performing CRE for assignment.
    const cre = await getPerformanceBasedCRE();
    // Use the date of the first message as the createdAt time.
    const firstMessageTime = processedMessages[0].date;

    const newLead = new Lead({
        CID: '',
        name: otherParticipant.name,
        lastMsg: processedMessages[processedMessages.length - 1].content,
        status: 'New',
        pageInfo: {
            pageId: pageInfo.pageId,
            pageName: pageInfo.pageName,
            pageProfilePicture: pageInfo.pageProfilePicture,
            fbSenderID: otherParticipant.id,
        },
        messages: processedMessages,
        source: 'Facebook',
        creName: cre,
        createdAt: new Date(firstMessageTime),
        messagesSeen: lastMessageSentFromUs,
        lastAssigned: new Date(),
    });

    const savedNewLead = await newLead.save();
    emitSocketEventsForNewMessage(io, savedNewLead, pageInfo);

    // notify the user about the new lead
    await notifyNewLeadAssignment(savedNewLead._id, cre._id);

    return savedNewLead;
};

/**
 * Retrieves CRE (Customer Representative) details by ID.
 * @param {string} id - The CRE's user ID.
 * @returns {Object|null} - The CRE document or null if not found.
 */
const getCreInfo = async (id) => {
    const cre = await User.findOne({ _id: id });
    return cre || null;
};

/**
 * Emits Socket.io events to notify clients about new or updated lead messages.
 * @param {Object} io - Socket.io instance.
 * @param {Object} savedLead - The lead document that was saved/updated.
 * @param {Object} pageInfo - Facebook page information.
 */
const emitSocketEventsForNewMessage = async (io, savedLead, pageInfo) => {
    // Get CRE information for the lead assignment.
    const cre = await getCreInfo(savedLead.creName);

    // Build a CRE info object if available.
    let creName = null;
    if (cre) {
        creName = {
            _id: cre._id,
            name: cre.name,
            profilePicture: cre.profilePicture,
            nickName: cre.nickName,
        };
    }

    const custommersMessages = savedLead.messages.filter((message) => message.sentByMe === false);
    const lastCustomerMessageTime = custommersMessages[custommersMessages.length - 1]?.date;

    // Construct the payload for the socket event.
    const socketPayload = {
        name: savedLead.name,
        lastMessage: savedLead.messages[savedLead.messages.length - 1].content || '',
        lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
        lastCustomerMessageTime,
        sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
        createdAt: savedLead.createdAt,
        messagesSeen: savedLead.messagesSeen,
        creName: { ...creName },
        pageInfo: {
            pageName: pageInfo.pageName,
            pageId: pageInfo.pageId,
            pageProfilePicture: pageInfo.pageProfilePicture,
        },
        status: savedLead.status,
        _id: savedLead._id,
    };

    // Emit socket events for conversation updates.
    io.emit('conversation', socketPayload);
    io.emit('newLead', { newLead: socketPayload });
};

/**
 * Main function to fetch Facebook conversations and update lead data.
 * Iterates over all Facebook pages, retrieves conversations, processes them,
 * and updates or creates leads accordingly.
 * @param {Object} io - Socket.io instance.
 */
const getConversationsAndUpdateLeadsUpdated = async (io) => {
    console.time('getConversationsAndUpdateLeadsUpdated');
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
    console.timeEnd('getConversationsAndUpdateLeadsUpdated');
};

/**
 * Generates an AI response based on the provided model and message.
 * @param {string} aiModel - The AI model to use for generating the response.
 * @param {Object} message - The message object containing content and other details.
 * @returns {string} - The generated AI response.
 */
async function getAIResponse(aiModel, message) {
    // Call your AI assistant logic here, passing the model and message context
    // Return the generated text
    // Example: return await Assistant.generate(aiModel, message);
    return 'This is an AI-generated reply.'; // Placeholder
}

module.exports = {
    getConversationsAndUpdateLeadsUpdated,
    emitSocketEventsForNewMessage,
    getCreInfo,
};
