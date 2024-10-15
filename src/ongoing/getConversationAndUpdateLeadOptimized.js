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
const findCREWithLowestLeads = require('../helpers/findCREWithLowestLeads');
const People = require('../schemas/PeopleSchema');

const processMessages = (messages) => {
    let phoneNumber = '';
    const processedMessages = messages.map((msg) => {
        let fileUrl = [];

        if (msg.from.name !== 'Solution Provider') {
            const content = msg.message || '';
            const potentialNumber = content.replace(/[^0-9]+/g, '');
            if (potentialNumber) {
                const parsedNumber = parsePhoneNumberFromString(potentialNumber, 'BD');
                if (parsedNumber && parsedNumber.isValid()) {
                    phoneNumber = parsedNumber; // Update phoneNumber only if valid
                }
            }
        }

        if (
            msg?.attachments &&
            msg?.attachments?.data?.length > 0 &&
            msg?.attachments?.data[0]?.image_data
        ) {
            fileUrl = msg?.attachments?.data?.map((att) => att.image_data.url);
        }

        return {
            messageId: msg.id,
            content: msg.message,
            senderId: msg.from.id,
            senderName: msg.from.name,
            sentByMe: msg.from.name === 'Solution Provider',
            date: moment(msg.created_time).format('LLL'),
            fileUrl,
        };
    });

    return { processedMessages, phoneNumber };
};

// Reusable error logging function
const logError = (message, error) => {
    console.error(`${message}: ${error}`);
    const currentTime = new Date().toLocaleString();
    console.error(`${currentTime} => ${message}`);
};

// Fetch Facebook settings from the database
const fetchFacebookSettings = async () => {
    const fbSettings = await Settings.findOne({ name: 'facebook' });
    if (!fbSettings || !fbSettings.settingsData.page) {
        throw new Error('Facebook settings or access tokens not found');
    }
    return fbSettings.settingsData.page;
};

// Create a mapping of CRE names to their IDs
const getCREMapping = async () => {
    const cres = await People.find({ role: 'CRE' });
    return cres.reduce((map, cre) => {
        const lastName = cre.name.split(' ').pop();
        map[lastName] = cre._id;
        return map;
    }, {});
};

// Fetch conversations from Facebook Graph API
const fetchConversationsFromFacebook = async (pageId, pageAccessToken) => {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,created_time,attachments{image_data},from}&limit=${process.env.LIMIT}&access_token=${pageAccessToken}`,
            { timeout: 10000 }
        );
        return response.data.data;
    } catch (error) {
        logError(`Error fetching data for page ${pageId}`, error);
        return [];
    }
};

// Process each conversation to update or create leads
const processConversation = async (conversation, nameToCreId, io, pageInfo) => {
    try {
        const otherParticipant = conversation.participants.data.find(
            (p) => p.name !== 'Solution Provider'
        );
        const fbSenderID = otherParticipant.id;
        const { processedMessages, phoneNumber } = processMessages(
            [...conversation.messages.data].reverse()
        );

        const lead = await Lead.findOne({ 'pageInfo.fbSenderID': fbSenderID });

        if (lead) {
            await updateExistingLead(
                lead,
                processedMessages,
                phoneNumber,
                nameToCreId,
                io,
                pageInfo
            );
        } else {
            await createNewLead(otherParticipant, processedMessages, pageInfo, io);
        }
    } catch (error) {
        logError('Error processing a single conversation', error);
    }
};

// Update an existing lead with new messages or information
const updateExistingLead = async (
    lead,
    processedMessages,
    phoneNumber,
    nameToCreId,
    io,
    pageInfo
) => {
    let isNewMessageAdded = false;
    let newCreId = lead.creName;

    for (const message of processedMessages) {
        if (!lead.messages.find((m) => m.messageId === message.messageId)) {
            lead.messages.push(message);
            lead.messagesSeen = false;

            Object.entries(nameToCreId).forEach(([name, id]) => {
                if (message.content.includes(name)) {
                    newCreId = id;
                }
            });

            io.emit(`fbMessage${lead._id}`, message);
            isNewMessageAdded = true;
        }
    }

    if (isNewMessageAdded) {
        lead.lastMsg = processedMessages[processedMessages.length - 1].content;
        lead.creName = newCreId;

        if (phoneNumber?.number?.length === 14) {
            const formattedPhoneNumber = phoneNumber.formatInternational();
            if (!lead.phone.includes(formattedPhoneNumber)) {
                lead.phone.push(formattedPhoneNumber);
            }
            lead.status = 'Number Collected';
        }

        const savedLead = await lead.save();
        emitSocketEventsForNewMessage(io, savedLead, pageInfo);
    }
};

// Create a new lead if no matching lead exists
const createNewLead = async (otherParticipant, processedMessages, pageInfo, io) => {
    const cre = await findCREWithLowestLeads();
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
        messagesSeen: false,
    });

    const savedNewLead = await newLead.save();
    emitSocketEventsForNewMessage(io, savedNewLead, pageInfo);
};

// Emit Socket.io events for new messages or leads
const emitSocketEventsForNewMessage = (io, savedLead, pageInfo) => {
    const socketPayload = {
        name: savedLead.name,
        lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
        lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
        sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
        createdAt: savedLead.createdAt,
        creName: savedLead.creName,
        pageInfo: {
            pageName: pageInfo.pageName,
            pageId: pageInfo.pageId,
            pageProfilePicture: pageInfo.pageProfilePicture,
        },
        status: savedLead.status,
        _id: savedLead._id,
    };

    io.emit('conversation', socketPayload);
    io.emit('newLead', { newLead: socketPayload });
};

// Main function to fetch conversations and update leads
const getConversationsAndUpdateLeadsUpdated = async (io) => {
    console.time('getConversationsAndUpdateLeads');
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
    console.timeEnd('getConversationsAndUpdateLeads');
};

module.exports = getConversationsAndUpdateLeadsUpdated;
