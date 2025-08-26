// src/services/whatsappClient.js
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
} = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const { getIO } = require('../socket/socketService');
const { handleWhatsAppUpsert } = require('./waMessageHandler');

const STATE_DIR = path.join(__dirname, '../../wa_auth');

let sock = null;
let connected = false;
let starting = false;
let lastQR = null; // <-- store the last QR text

async function startBaileys() {
    if (starting) return sock;
    starting = true;

    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(STATE_DIR);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('EaseIT CRM'),
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        const io = getIO?.() || null;

        if (qr) {
            connected = false;
            lastQR = qr; // <-- keep QR in memory
            if (io) io.emit('wa_qr', qr);
        }

        if (connection === 'open') {
            connected = true;
            lastQR = null; // <-- clear QR once connected
            if (io) io.emit('wa_connected');
        }

        if (connection === 'close') {
            connected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => startBaileys(), 1_000);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        await handleWhatsAppUpsert(m, sock);
    });

    starting = false;
    return sock;
}

/** Public helpers */
function getWhatsAppStatus() {
    const userId = sock?.user?.id || null;
    return { connected: !!connected, userJid: userId };
}

/** NEW: expose current QR (if any) */
function getPendingQR() {
    return { connected: !!connected, qr: connected ? null : lastQR };
}

async function restartWhatsApp() {
    return startBaileys();
}

async function logoutWhatsApp() {
    try {
        if (sock) await sock.logout();
    } catch (_) {}
    try {
        fs.rmSync(STATE_DIR, { recursive: true, force: true });
    } catch (_) {}
    connected = false;
    sock = null;
    lastQR = null; // <-- clear QR on logout
    return startBaileys();
}

async function sendTextMessage(to, text) {
    if (!sock || !connected) throw new Error('WhatsApp client is not connected');
    let jid = to;
    if (!jid.includes('@')) jid = `${to.replace('+', '')}@s.whatsapp.net`;
    const sentMsg = await sock.sendMessage(jid, { text });
    return sentMsg;
}

function getSock() {
    if (!sock) console.error('[WA] sock is not connected');
    return sock;
}

module.exports = {
    startBaileys,
    getWhatsAppStatus,
    getPendingQR, // <-- export
    restartWhatsApp,
    logoutWhatsApp,
    sendTextMessage,
    getSock,
};
