/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const path = require('path');
const Lead = require('../../schemas/LeadsSchema');
const { startBaileys, getSock } = require('./whatsappClient');
const { getIO } = require('../../socket/socketService');
const { createNewMessageObject } = require('../../controller/lead/leadConversationController');
const { logger } = require('../../config/winston');
const { emitLeadMessage } = require('../../utils/socketEmitter');

/** Pick a destination JID for this lead */
function resolveDestinationJid(lead) {
    const jid = lead?.whatsAppInfo?.jid;
    const lid = lead?.whatsAppInfo?.lid;
    if (jid) return jid;
    if (lid) return `${lid}@lid`;

    // fallback to first phone (E.164) -> classic JID
    const firstPhone = Array.isArray(lead?.phone) ? lead.phone[0] : null;
    if (firstPhone) {
        const username = String(firstPhone).replace(/^\+/, ''); // "+8801..." -> "8801..."
        return `${username}@s.whatsapp.net`;
    }
    return null;
}

/** Build a Lead.messages[] doc for an outbound message we just sent */
function buildOutboundMessageDoc({ msgId, toJid, content, fileUrls = [] }) {
    return {
        messageId: msgId || '',
        content: content || '',
        senderId: toJid || '',
        isAutomatedMessage: false,
        sentByMe: true,
        fileUrl: fileUrls,
        isSticker: false,
        isAiMessage: false,
        date: new Date(),
    };
}

/** Minimal emitter (same shape you already use in FB path) */
async function emitForLead(io, savedLead) {
    const last = savedLead.messages[savedLead.messages.length - 1];
    const customerMsgs = savedLead.messages.filter((m) => m.sentByMe === false);
    const lastCustomerMessageTime = customerMsgs[customerMsgs.length - 1]?.date;

    const payload = {
        name: savedLead.name,
        lastMessage: last?.content || '',
        lastMessageTime: last?.date,
        lastCustomerMessageTime,
        sentByMe: last?.sentByMe || false,
        createdAt: savedLead.createdAt,
        messagesSeen: savedLead.messagesSeen,
        creName: savedLead.creName || null,
        status: savedLead.status,
        _id: savedLead._id,
        source: savedLead.source,
        phone: savedLead.phone,
        profilePicture: savedLead.profilePicture || undefined,
        whatsAppInfo: savedLead.whatsAppInfo || undefined,
    };

    const newMessage = {
        messageId: last.messageId,
        content: last.content,
        senderId: last.senderId,
        sentByMe: last.sentByMe,
        date: new Date(),
    };

    io.emit('conversation', payload);
    io.emit('newLead', { newLead: payload });
    // Use the centralized function for emitting lead messages
    emitLeadMessage({ io, leadId: savedLead._id, message: newMessage });
}

/**
 * Send a WhatsApp message via Baileys and persist it on the Lead.
 * @param {Lead} lead - Mongoose Lead document (already fetched)
 * @param {'text'|'image'|'video'|'audio'|'file'|'document'|'sticker'} messageType
 * @param {object} content - payload object (see below)
 *   - text: { text: string }
 *   - image: { urls: string[] | string, caption?: string }
 *   - video: { urls: string[] | string, caption?: string }
 *   - audio: { urls: string[] | string }  // ogg/mp3/etc
 *   - file/document: { urls: string[] | string, fileName?: string, mimetype?: string }
 *   - sticker: { urls: string[] | string } // webp
 * @param {object} [ioOverride] - optional io instance
 * @returns {Promise<Array>} array of created message docs
 */
async function sendWhatsAppMessage(lead, messageType, content, ioOverride) {
    // if (!lead) throw new Error('Lead is required');
    // if (lead.source !== 'WhatsApp') throw new Error('Lead source is not WhatsApp');

    const toJid = resolveDestinationJid(lead);
    // if (!toJid) throw new Error('No WhatsApp identifier found for lead (jid/lid/phone missing)');
    console.log('toJid', toJid);

    // Ensure we have a connected socket
    // const sock = await startBaileys();
    const sock = getSock();
    const io = ioOverride || getIO();

    // Normalize urls to an array (for media types)
    const normalizeUrls = (urls) => {
        if (!urls) return [];
        return Array.isArray(urls) ? urls : [urls];
    };

    const newMessages = [];

    // Send based on type
    if (messageType === 'text') {
        const text = content?.text || '';
        const sent = await sock.sendMessage(toJid, { text });
        const msgId = sent?.key?.id || '';
        const doc = buildOutboundMessageDoc({
            msgId,
            toJid,
            content: text,
            fileUrls: [],
        });
        lead.messages.push(doc);
        lead.lastMsg = text;
    } else if (messageType === 'image') {
        const urls = normalizeUrls(content?.urls);
        for (const url of urls) {
            const sent = await sock.sendMessage(toJid, {
                image: { url },
                caption: content?.caption || '',
            });
            const msgId = sent?.key?.id || '';
            const doc = buildOutboundMessageDoc({
                msgId,
                toJid,
                content: content?.caption || '',
                fileUrls: [url],
            });
            lead.messages.push(doc);
            lead.lastMsg = doc.content || '📷 Image';
            newMessages.push(doc);
        }
    } else if (messageType === 'video') {
        const urls = normalizeUrls(content?.urls);
        for (const url of urls) {
            const sent = await sock.sendMessage(toJid, {
                video: { url },
                caption: content?.caption || '',
            });
            const msgId = sent?.key?.id || '';
            const doc = buildOutboundMessageDoc({
                msgId,
                toJid,
                content: content?.caption || '',
                fileUrls: [url],
            });
            lead.messages.push(doc);
            lead.lastMsg = doc.content || '🎬 Video';
            newMessages.push(doc);
        }
    } else if (messageType === 'audio') {
        const urls = normalizeUrls(content?.urls);
        for (const url of urls) {
            const sent = await sock.sendMessage(toJid, { audio: { url } });
            const msgId = sent?.key?.id || '';
            const doc = buildOutboundMessageDoc({
                msgId,
                toJid,
                content: 'Audio',
                fileUrls: [url],
            });
            lead.messages.push(doc);
            lead.lastMsg = '🎵 Audio';
            newMessages.push(doc);
        }
    } else if (messageType === 'file' || messageType === 'document') {
        const urls = normalizeUrls(content?.urls);
        for (const url of urls) {
            const payload = {
                document: { url },
                mimetype: content?.mimetype,
                fileName: content?.fileName || undefined,
            };
            const sent = await sock.sendMessage(toJid, payload);
            const msgId = sent?.key?.id || '';
            const doc = buildOutboundMessageDoc({
                msgId,
                toJid,
                content: content?.fileName || 'Document',
                fileUrls: [url],
            });
            lead.messages.push(doc);
            lead.lastMsg = doc.content || '📄 Document';
            newMessages.push(doc);
        }
    } else if (messageType === 'sticker') {
        const urls = normalizeUrls(content?.urls);
        for (const url of urls) {
            const sent = await sock.sendMessage(toJid, { sticker: { url } });
            const msgId = sent?.key?.id || '';
            const doc = buildOutboundMessageDoc({
                msgId,
                toJid,
                content: 'Sticker',
                fileUrls: [url],
            });
            doc.isSticker = true;
            lead.messages.push(doc);
            lead.lastMsg = '🔖 Sticker';
            newMessages.push(doc);
        }
    } else {
        console.error(`Unsupported messageType: ${messageType}`);
    }

    // Common lead flags
    lead.messagesSeen = true;
    lead.repliedFromSystem = true;
    lead.lastMessageSentFromUs = true;

    const saved = await lead.save();
    await emitForLead(io, saved);

    // If text path only, ensure we return array consistently
    if (messageType === 'text') {
        const last = saved.messages[saved.messages.length - 1];
        return [last];
    }
    return newMessages;
}

module.exports = {
    sendWhatsAppMessage,
};
