/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
const moment = require('moment');
const Lead = require('../schemas/LeadsSchema');
const Settings = require('../schemas/SettingsSchema');
const User = require('../schemas/auth/UserSchema');
const { isAutomatedMessage } = require('./isAutomatedMessage');
const { getPerformanceBasedCRE } = require('./getPerformanceBasedCRE');
const { notifyNewLeadAssignment } = require('./notification/lead/leadTriggers');
const { emitLeadMessage, emitConversationUpdate } = require('../utils/socketEmitter');

// Normalize and map raw FB messages (no phone extraction)
const processMessages = (messages) => {
    let lastCustomerMessageTime = null;
    const lastMessage = messages[messages.length - 1];
    const lastMessageSentFromUs = lastMessage?.from?.name === 'Solution Provider';

    const processedMessages = messages.map((msg) => {
        let fileUrl = [];
        const fileTypes = [];

        if (msg.from?.name !== 'Solution Provider') {
            lastCustomerMessageTime = msg.created_time;
        }

        const hasAttachments = Boolean(
            msg.attachments && msg.attachments.data && msg.attachments.data.length > 0
        );
        const firstAttachment = hasAttachments ? msg.attachments.data[0] : null;
        const hasImage = Boolean(firstAttachment && firstAttachment.image_data);
        const hasVideo = Boolean(firstAttachment && firstAttachment.video_data);
        const hasFile = Boolean(firstAttachment && firstAttachment.file_url);
        const hasMedia = hasImage || hasVideo || hasFile;

        if (hasAttachments && hasMedia) {
            const attachment = firstAttachment;
            if (attachment.image_data) fileTypes.push('image');
            else if (attachment.video_data) fileTypes.push('video');
            else {
                const hasFileUrl = Boolean(firstAttachment && firstAttachment.file_url);
                const hasMimeType = Boolean(firstAttachment && firstAttachment.mime_type);
                const isAudio = hasFileUrl && hasMimeType && firstAttachment.mime_type.startsWith('audio');

                if (isAudio) fileTypes.push('audio');
            }

            fileUrl = msg.attachments.data.map((item) => {
                if (item.image_data) return item.image_data.url;
                if (item.video_data) return item.video_data.url;
                if (item.file_url) return item.file_url;
                return [];
            });
        }

        return {
            messageId: msg.id,
            content: msg.message,
            isAutomatedMessage: isAutomatedMessage(msg.message),
            senderId: msg.from?.id,
            senderName: msg.from?.name,
            sentByMe: msg.from?.name === 'Solution Provider',
            date: moment(msg.created_time).format('LLL'),
            fileUrl,
            fileTypes,
        };
    });

    return { processedMessages, lastMessageSentFromUs, lastCustomerMessageTime };
};

// Get CRE document for sockets
const getCreInfo = async (id) => {
    const cre = await User.findOne({ _id: id });
    return cre || null;
};

// Emit socket updates for a lead
const emitSocketEventsForNewMessage = async (io, savedLead, pageInfo) => {
    const cre = await getCreInfo(savedLead.creName);

    let creName = null;
    if (cre) {
        creName = {
            _id: cre._id,
            name: cre.name,
            profilePicture: cre.profilePicture,
            nickName: cre.nickName,
        };
    }

    const customerMessages = savedLead.messages.filter((m) => m.sentByMe === false);
    const lastCustomerMessageTime = customerMessages[customerMessages.length - 1]?.date;

    const socketPayload = {
        name: savedLead.name,
        lastMessage: savedLead.messages[savedLead.messages.length - 1]?.content || '',
        lastMessageTime: savedLead.messages[savedLead.messages.length - 1]?.date,
        lastCustomerMessageTime,
        sentByMe: savedLead.messages[savedLead.messages.length - 1]?.sentByMe,
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

    emitConversationUpdate({ io, lead: savedLead });
    io.emit('newLead', { newLead: socketPayload });
};

// Update an existing lead with new messages
const updateExistingLead = async (
    lead,
    processedMessages,
    nameToCreId,
    io,
    pageInfo,
    lastMessageSentFromUs,
    lastCustomerMessageTime
) => {
    let isNewMessageAdded = false;
    let newCreId = lead.creName;

    processedMessages.forEach((message) => {
        if (!lead.messages.find((m) => m.messageId === message.messageId)) {
            lead.messages.push(message);

            Object.entries(nameToCreId).forEach(([name, id]) => {
                if (message.content && message.content.includes(name)) {
                    newCreId = id;
                }
            });

            emitLeadMessage({ io, leadId: lead._id, message });
            isNewMessageAdded = true;
        }
    });

    if (isNewMessageAdded) {
        const lastProcessed = processedMessages[processedMessages.length - 1] || {};
        lead.lastMsg = lastProcessed.content;
        lead.creName = newCreId;
        lead.messagesSeen = lastMessageSentFromUs;
        lead.repliedFromSystem = true;
        lead.lastMessageSentFromUs = lastMessageSentFromUs;
        if (lastCustomerMessageTime) {
            lead.lastCustomerMessageTime = lastCustomerMessageTime || null;
        }

        const savedLead = await lead.save();
        await emitSocketEventsForNewMessage(io, savedLead, pageInfo);
    }

    return isNewMessageAdded;
};

// Create a new lead from a conversation
const createNewLead = async (
    otherParticipant,
    processedMessages,
    pageInfo,
    io,
    lastMessageSentFromUs,
    lastCustomerMessageTime
) => {
    const cre = await getPerformanceBasedCRE();
    const firstMessageTime = processedMessages[0]?.date;

    const settings = await Settings.findOne({ name: 'ai-integration' });
    const { facebookPages } = settings.settingsData;
    const pageConfig = facebookPages.find((page) => page.pageId === pageInfo.pageId) || {};
    const { assistantId, aiEnabled } = pageConfig;

    const newLead = new Lead({
        CID: '',
        name: otherParticipant.name,
        lastMsg: processedMessages[processedMessages.length - 1]?.content,
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
        createdAt: firstMessageTime ? new Date(firstMessageTime) : new Date(),
        messagesSeen: lastMessageSentFromUs,
        lastAssigned: new Date(),
        lastMessageSentFromUs,
        lastCustomerMessageTime,
        aiBotReply: aiEnabled,
        aiBotConfig: { assistantId },
    });

    const savedNewLead = await newLead.save();
    await emitSocketEventsForNewMessage(io, savedNewLead, pageInfo);
    await notifyNewLeadAssignment(savedNewLead._id, cre._id);
    return savedNewLead;
};

// Process a Facebook conversation and create/update the lead
const processConversation = async (conversation, nameToCreId, io, pageInfo) => {
    const otherParticipant = conversation.participants?.data?.find(
        (p) => p.name !== pageInfo.pageName
    );
    if (!otherParticipant) return { created: false, updated: false };

    const messagesData = [...(conversation?.messages?.data || [])].reverse();
    const result = processMessages(messagesData);
    const { processedMessages, lastMessageSentFromUs, lastCustomerMessageTime } = result;

    let lead = await Lead.findOne({
        'pageInfo.fbSenderID': otherParticipant.id,
        source: 'Facebook',
    });

    let created = false;
    let updated = false;

    if (lead) {
        updated = await updateExistingLead(
            lead,
            processedMessages,
            nameToCreId,
            io,
            pageInfo,
            lastMessageSentFromUs,
            lastCustomerMessageTime
        );
    } else {
        lead = await createNewLead(
            otherParticipant,
            processedMessages,
            pageInfo,
            io,
            lastMessageSentFromUs,
            lastCustomerMessageTime
        );
        created = true;
    }

    await lead.save();
    return { created, updated };
};

module.exports = {
    processMessages,
    getCreInfo,
    emitSocketEventsForNewMessage,
    updateExistingLead,
    createNewLead,
    processConversation,
};
