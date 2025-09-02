/* eslint-disable operator-linebreak */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const Lead = require('../../schemas/LeadsSchema');
const { getPerformanceBasedCRE } = require('../../helpers/getPerformanceBasedCRE');
const { getIO } = require('../../socket/socketService');

/** ---------- ID helpers ---------- */

/** Split a JID into user + domain */
function splitJid(jid) {
    if (!jid) return { user: null, domain: null };
    const [user, domain] = String(jid).split('@');
    return { user, domain };
}

/**
 * Classify a JID
 * - user_phone: classic phone JID  e.g. 8801xxxx@s.whatsapp.net
 * - user_lid:   privacy LID JID     e.g. 115556699136116@lid
 * - group:      group JID           e.g. 1203...@g.us
 * - broadcast/status/unknown: other domains
 */
function classifyJid(jid) {
    const { user, domain } = splitJid(jid);
    if (!user || !domain) return { kind: 'unknown', user, domain };

    if (domain === 's.whatsapp.net') return { kind: 'user_phone', user, domain };
    if (domain === 'lid') return { kind: 'user_lid', user, domain };
    if (domain === 'g.us') return { kind: 'group', user, domain };
    if (domain === 'broadcast') return { kind: 'broadcast', user, domain };
    if (domain === 'status') return { kind: 'status', user, domain };

    return { kind: 'unknown', user, domain };
}

/** Only parse phone from classic @s.whatsapp.net JIDs → returns E.164 +8801... */
function phoneFromJid(jid, defaultCountry = 'BD') {
    const { user, domain } = splitJid(jid);
    if (domain !== 's.whatsapp.net' || !user) return null;

    const parsed = parsePhoneNumberFromString(user, defaultCountry);
    if (parsed && parsed.isValid()) return parsed.number; // "+8801..."
    if (/^\d{10,15}$/.test(user)) return `+${user}`;
    return null;
}

/** Try to fetch profile picture URL; return null on any failure */
async function getProfilePicture(sock, jid) {
    if (!sock || !jid) return null;
    try {
        // 'image' gives full res; 'preview' gives smaller
        const url = await sock.profilePictureUrl(jid, 'image');
        return url || null;
    } catch (_) {
        return null;
    }
}

/** ---------- Message normalization ---------- */

function buildLeadMessageDoc(msg) {
    const messageId = msg?.key?.id || '';
    const sentByMe = !!msg?.key?.fromMe;
    const senderId = msg?.key?.remoteJid || '';
    const ts = Number(msg?.messageTimestamp || Date.now());
    const date = new Date(ts * (ts < 2e12 ? 1000 : 1)); // seconds → ms guard

    let content = '';
    const fileUrl = [];
    let isSticker = false;

    const m = msg.message || {};
    if (m.conversation) content = m.conversation;
    else if (m.extendedTextMessage?.text) content = m.extendedTextMessage.text;

    if (m.imageMessage) {
        if (m.imageMessage.caption) content = m.imageMessage.caption;
        if (m.imageMessage.url) fileUrl.push(m.imageMessage.url);
    }
    if (m.videoMessage) {
        if (m.videoMessage.caption) content = m.videoMessage.caption;
        if (m.videoMessage.url) fileUrl.push(m.videoMessage.url);
    }
    if (m.audioMessage) {
        if (m.audioMessage.url) fileUrl.push(m.audioMessage.url);
        if (!content) content = m.audioMessage.ptt ? 'Voice message' : 'Audio';
    }
    if (m.documentMessage) {
        if (m.documentMessage.url) fileUrl.push(m.documentMessage.url);
        if (!content) content = m.documentMessage.fileName || 'Document';
    }
    if (m.stickerMessage) {
        isSticker = true;
        if (m.stickerMessage.url) fileUrl.push(m.stickerMessage.url);
        if (!content) content = 'Sticker';
    }
    if (m.ptvMessage) {
        if (m.ptvMessage.url) fileUrl.push(m.ptvMessage.url);
        if (!content) content = 'Circle video';
    }
    if (m.reactionMessage && !content) {
        content = `Reaction: ${m.reactionMessage.text || ''}`;
    }

    return {
        messageId,
        content: content || '',
        senderId,
        isAutomatedMessage: false,
        sentByMe,
        fileUrl,
        isSticker,
        isAiMessage: false,
        date,
    };
}

/** Emit socket payloads (minimal) */
async function emitForLead(io, savedLead) {
    const last = savedLead.messages[savedLead.messages.length - 1];
    const customerMsgs = savedLead.messages.filter((m) => m.sentByMe === false);
    const lastCustomerMessageTime = customerMsgs[customerMsgs.length - 1]?.date;

    const socketPayload = {
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

    io.emit('conversation', socketPayload);
    io.emit('newLead', { newLead: socketPayload });
}

/** Decide the best display name to show/store */
function resolveDisplayName({
 fromMe, pushName, verifiedBizName, currentName 
}) {
    // If it's our own outbound message, don't overwrite with our own name
    if (fromMe) return currentName || 'WhatsApp Contact';

    if (verifiedBizName && verifiedBizName.trim()) return verifiedBizName.trim();
    if (pushName && pushName.trim()) return pushName.trim();
    return currentName || 'WhatsApp Contact';
}

/** ---------- Lead upsert ---------- */

async function upsertLeadForWAMessage(msg, io, sock) {
    const jid = msg?.key?.remoteJid;
    const fromMe = !!msg?.key?.fromMe;
    const pushName = msg?.pushName || '';
    const verifiedBizName = msg?.verifiedBizName || '';
    console.log(msg);

    const { kind, user } = classifyJid(jid);

    // Skip groups/system JIDs
    if (kind === 'group' || kind === 'broadcast' || kind === 'status' || kind === 'unknown') {
        console.log('[WA] Skipping non-user message from:', jid, 'kind:', kind);
        return null;
    }

    const e164 = phoneFromJid(jid);
    const lid = kind === 'user_lid' ? user : undefined;

    const messageDoc = buildLeadMessageDoc(msg);
    const lastMessageSentFromUs = messageDoc.sentByMe; // same as fromMe
    const isCustomer = !lastMessageSentFromUs;

    // Lookup order: jid -> lid -> phone (scoped to WhatsApp)
    let lead =
        (await Lead.findOne({ source: 'WhatsApp', 'whatsAppInfo.jid': jid })) ||
        (lid ? await Lead.findOne({ source: 'WhatsApp', 'whatsAppInfo.lid': lid }) : null) ||
        (e164 ? await Lead.findOne({ source: 'WhatsApp', phone: e164 }) : null);

    // Cross-source by phone (optional but helpful)
    if (!lead && e164) {
        lead = await Lead.findOne({ phone: e164 });
    }

    // Best-effort: fetch profile picture
    const profilePicture = await getProfilePicture(sock, jid);

    if (lead) {
        // Improve name (only for inbound or if placeholder)
        const newName = resolveDisplayName({
            fromMe,
            pushName,
            verifiedBizName,
            currentName: lead.name,
        });
        if (newName && newName !== lead.name) {
            if (!fromMe || !lead.name || /^(WhatsApp (User|Contact))$/i.test(lead.name)) {
                lead.name = newName;
            }
        }

        // Push message if new
        if (!lead.messages.some((m) => m.messageId === messageDoc.messageId)) {
            lead.messages.push(messageDoc);
            lead.lastMsg = messageDoc.content;
            lead.lastMessageSentFromUs = lastMessageSentFromUs;
            lead.messagesSeen = lastMessageSentFromUs;

            if (isCustomer) {
                lead.lastCustomerMessageTime = messageDoc.date || new Date();
            }

            // Ensure WA identifiers captured
            if (!lead.whatsAppInfo) lead.whatsAppInfo = {};
            if (!lead.whatsAppInfo.jid && jid) lead.whatsAppInfo.jid = jid;
            if (!lead.whatsAppInfo.lid && lid) lead.whatsAppInfo.lid = lid;

            // Update labels/picture
            if (pushName) lead.whatsAppInfo.pushName = pushName;
            if (verifiedBizName) lead.whatsAppInfo.verifiedBizName = verifiedBizName;
            if (profilePicture) {
                lead.whatsAppInfo.profilePicture = profilePicture;
                if (!lead.profilePicture) lead.profilePicture = profilePicture; // mirror to top level
            }

            // Store phone if present
            if (e164 && !lead.phone.includes(e164)) lead.phone.push(e164);

            await lead.save();
            await emitForLead(io, lead);
        }
        return lead;
    }

    // ✋ Do NOT create a new lead from our own outbound message
    if (fromMe) {
        console.log('[WA] Outbound message with no matching lead — not creating a new lead.');
        return null;
    }

    // Create on inbound
    const cre = await getPerformanceBasedCRE().catch(() => null);

    const nameForNewLead = resolveDisplayName({
        fromMe,
        pushName,
        verifiedBizName,
        currentName: '', // new lead
    });

    const newLead = new Lead({
        CID: '',
        name: nameForNewLead,
        profilePicture: profilePicture || undefined,
        lastMsg: messageDoc.content,
        status: 'Number Provided',
        source: 'WhatsApp',
        phone: e164 ? [e164] : [],
        messages: [messageDoc],
        creName: cre || undefined,
        messagesSeen: lastMessageSentFromUs,
        lastAssigned: new Date(),
        lastMessageSentFromUs,
        lastCustomerMessageTime: isCustomer ? messageDoc.date || new Date() : undefined,
        whatsAppInfo: {
            jid,
            lid: lid || undefined,
            pushName: pushName || undefined,
            verifiedBizName: verifiedBizName || undefined,
            profilePicture: profilePicture || undefined,
        },
    });

    const saved = await newLead.save();
    await emitForLead(io, saved);
    return saved;
}

/** Entry from Baileys: pass the socket so we can fetch profile pics */
async function handleWhatsAppUpsert(m, sock) {
    const io = getIO();
    if (!m || !Array.isArray(m.messages)) return;
    for (const msg of m.messages) {
        if (!msg.message) continue;
        try {
            await upsertLeadForWAMessage(msg, io, sock);
        } catch (err) {
            console.error('[WA upsert] Error processing message:', err);
        }
    }
}

module.exports = {
    handleWhatsAppUpsert,
    upsertLeadForWAMessage,
    buildLeadMessageDoc,
    phoneFromJid,
    classifyJid,
    splitJid,
    getProfilePicture,
};
