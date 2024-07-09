/* eslint-disable prettier/prettier */
/* eslint-disable no-continue */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable no-loop-func */
/* eslint-disable prettier/prettier */
/**
 * Fetches conversations from the Facebook Graph API using the provided page access token,
 * updates existing leads or creates new leads with the conversation messages,
 * and emits socket.io events when new messages are added.
 */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const moment = require('moment');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const findCREWithLowestLeads = require('../helpers/findCREWithLowestLeads');
const People = require('../schemas/PeopleSchema');

const logError = (message, error) => {
    const currentTime = new Date().toLocaleString();
    console.error(`${currentTime} => ${message}`);
    // Optionally, send the error to a logging service or notify via email/SMS
    // sendErrorNotification(message, error);
};

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

        if (msg?.attachments && msg?.attachments?.data?.length > 0 && msg?.attachments?.data[0]?.image_data) {
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

const getConversationsAndUpdateLeads = async (io) => {
    // console.time('getConversationsAndUpdateLeads 2');
    try {
        const fbSettings = await Settings.findOne({ name: 'facebook' });
        if (!fbSettings || !fbSettings.settingsData.page) {
            throw new Error('Facebook settings or access tokens not found');
        }

        const cres = await People.find({ role: 'CRE' });

        const nameToCreId = cres.reduce((map, cre) => {
            const lastName = cre.name.split(' ').pop();
            map[lastName] = cre._id;
            return map;
        }, {});

        for (const page of fbSettings.settingsData.page) {
            const {
 pageAccessToken, pageId, name: pageName, picture: pageProfilePicture
} = page;

            try {
                const response = await axios.get(
                    `https://graph.facebook.com/${pageId}/conversations?fields=participants,messages{id,message,created_time,attachments{image_data},from}&limit=${process.env.LIMIT}&access_token=${pageAccessToken}`,
                    { timeout: 10000 }
                );

                const conversations = response.data.data;

                for (const conversation of conversations) {
                    try {
                        const otherParticipant = conversation.participants.data.find(
                            (p) => p.name !== 'Solution Provider'
                        );

                        const fbSenderID = otherParticipant.id;
                        const { processedMessages, phoneNumber } = processMessages(
                            [...conversation.messages.data].reverse()
                        );

                        const lead = await Lead.findOne({ fbSenderID });

                        if (lead) {
                            let isNewMessageAdded = false;
                            let newCreId = lead.creName;

                            for (const message of processedMessages) {
                                if (!lead.messages.find((m) => m.messageId === message.messageId)) {
                                    lead.messages.push(message);

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
                                    lead.phone = phoneNumber.formatInternational();
                                    lead.status = 'Number Collected';
                                }

                                const savedLead = await lead.save();

                                const socketPayload = {
                                    name: savedLead.name,
                                    lastMessage: savedLead.messages[savedLead.messages.length - 1].content,
                                    lastMessageTime: savedLead.messages[savedLead.messages.length - 1].date,
                                    sentByMe: savedLead.messages[savedLead.messages.length - 1].sentByMe,
                                    createdAt: savedLead.createdAt,
                                    creName: savedLead.creName,
                                    sourcePageName: pageName,
                                    sourcePageId: pageId,
                                    sourcePageProfilePicture: pageProfilePicture,
                                    status: savedLead.status,
                                    _id: savedLead._id,
                                };

                                io.emit('conversation', socketPayload);
                            }
                        } else {
                            const cre = await findCREWithLowestLeads();
                            const firstMessageTime = processedMessages[0].date;

                            const newLead = new Lead({
                                CID: '',
                                name: otherParticipant.name,
                                lastMsg: processedMessages[processedMessages.length - 1].content,
                                status: 'unread',
                                fbSenderID,
                                messages: processedMessages,
                                source: 'Facebook',
                                sourcePageName: pageName,
                                sourcePageId: pageId,
                                sourcePageProfilePicture: pageProfilePicture,
                                creName: cre,
                                createdAt: new Date(firstMessageTime),
                            });
                            const savedNewLead = await newLead.save();
                            const socketPayload = {
                                name: savedNewLead.name,
                                lastMessage: savedNewLead.lastMsg,
                                sourcePageName: pageName,
                                sourcePageId: pageId,
                                sourcePageProfilePicture: pageProfilePicture,
                                lastMessageTime: savedNewLead.messages[0].date,
                                sentByMe: savedNewLead.messages[0].sentByMe,
                                createdAt: savedNewLead.createdAt,
                                _id: savedNewLead._id,
                            };

                            io.emit('conversation', socketPayload);

                            const socketPayloadNewLead = {
                                ...savedNewLead._doc,
                                sourcePageName: pageName,
                                sourcePageId: pageId,
                                sourcePageProfilePicture: pageProfilePicture,
                                status: savedNewLead.status,
                                creName: await People.findOne({ _id: cre }).select('name role avatar'),
                            };

                            io.emit('newLead', { newLead: socketPayloadNewLead });
                        }
                    } catch (innerError) {
                        logError('Error processing a single conversation', innerError);
                        continue;
                    }
                }
            } catch (error) {
                logError(`Error fetching or processing data for page ${pageId}`, error);
            }
        }
    } catch (error) {
        logError('Error fetching or processing data', error);
    }
    // console.timeEnd('getConversationsAndUpdateLeads 2');
};

module.exports = getConversationsAndUpdateLeads;
