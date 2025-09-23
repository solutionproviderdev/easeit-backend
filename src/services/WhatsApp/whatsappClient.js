let makeWASocket;
let DisconnectReason;
let Browsers;

async function loadBaileys() {
    if (!makeWASocket) {
        const baileys = await import('baileys');
        makeWASocket = baileys.default;
        DisconnectReason = baileys.DisconnectReason;
        Browsers = baileys.Browsers;
    }
}
const { getIO } = require('../../socket/socketService');
const { handleWhatsAppUpsert } = require('./waMessageHandler');
const { useMongoAuthState } = require('./mongoAuthState');

const ACCOUNT_ID = 'default';

let sock = null;
let connected = false;
let starting = false;
let lastQR = null; // <-- store the last QR text
let retryCount = 0;
const MAX_RETRIES = 5;

// Exponential backoff calculation
function getRetryDelay(attempt) {
    return Math.min(10000 * 2 ** attempt, 30000); // Max 30 seconds
}

async function startBaileys() {
    if (starting) {
        console.log('Already starting connection, skipping...');
        return sock;
    }

    starting = true;
    console.log('Starting WhatsApp connection...');

    try {
        // Load Baileys modules dynamically for v7 ESM compatibility
        await loadBaileys();

        // Use MongoDB-based auth state instead of file system
        const authStateManager = await useMongoAuthState(ACCOUNT_ID);
        const { state, saveCreds, updateStatus, updateQR, clearQR } = authStateManager;

        sock = makeWASocket({
            auth: state,
            browser: Browsers.macOS('Desktop'), // Use desktop browser for QR pairing
            getMessage: async (key) => undefined, // Return undefined if message not found
            markOnlineOnConnect: false, // Prevent auto-online to avoid notification issues
            syncFullHistory: true, // Reduce initial sync load
        });

        sock.ev.on('creds.update', saveCreds);

        // Handle connection close with improved retry logic
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;
            const io = getIO?.() || null;

            console.log('Connection update:', { connection, isNewLogin });

            if (qr) {
                console.log('QR Code received, updating QR state...');
                console.log('QR Code:', qr);
                connected = false;
                lastQR = qr; // <-- keep QR in memory
                console.log('QR Code generated:');
                console.log(qr);
                await updateQR(qr); // Save QR to MongoDB
                console.log('Please scan the QR code with WhatsApp mobile app.');
                if (io) io.emit('wa_qr', qr);
            }

            if (connection === 'connecting') {
                console.log('Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                connected = true;
                retryCount = 0; // Reset retry count on successful connection
                starting = false; // Reset starting flag only after successful connection
                lastQR = null; // <-- clear QR once connected
                await clearQR(); // Clear QR from MongoDB
                await updateStatus('connected', sock.user?.id?.split('@')[0], sock.user?.id);
                console.log('Successfully connected to WhatsApp!', sock.user?.id);
                if (io) io.emit('wa_connected');
            }

            if (connection === 'close') {
                connected = false;
                starting = false; // Reset starting flag on close
                await updateStatus('disconnected');
                const code = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = code !== DisconnectReason.loggedOut;

                console.log('Connection closed:', {
                    code,
                    reason: lastDisconnect?.error?.output?.payload?.message || 'Unknown',
                    shouldReconnect,
                    retryCount,
                });

                // Handle specific error codes
                if (code === 515) {
                    console.log('Stream error detected, waiting before restart...');
                    setTimeout(() => {
                        if (!starting && retryCount < MAX_RETRIES) {
                            retryCount++;
                            startBaileys();
                        }
                    }, 5000); // Wait 5 seconds before restarting
                } else if (code === 428) {
                    console.log('Connection lost, attempting reconnect...');
                    setTimeout(() => {
                        if (!starting && retryCount < MAX_RETRIES) {
                            retryCount++;
                            startBaileys();
                        }
                    }, 3000);
                } else if (code === 401) {
                    console.log('Authentication failed, clearing auth state...');
                    // Clear the corrupted auth state from MongoDB
                    try {
                        const { clearAuthState } = authStateManager;
                        if (clearAuthState) {
                            await clearAuthState();
                            console.log('Auth state cleared from MongoDB');
                        }
                    } catch (error) {
                        console.error('Error clearing auth state:', error);
                    }

                    setTimeout(() => {
                        if (!starting && retryCount < MAX_RETRIES) {
                            retryCount += 1;
                            startBaileys();
                        }
                    }, 2000);
                } else if (shouldReconnect && retryCount < MAX_RETRIES) {
                    const delay = Math.min(1000 * 2 ** retryCount, 30000); // Exponential backoff, max 30s
                    console.log(
                        `Attempting to reconnect (${
                            retryCount + 1
                        }/${MAX_RETRIES}) in ${delay}ms...`
                    );
                    setTimeout(() => {
                        if (!starting) {
                            retryCount++;
                            startBaileys();
                        }
                    }, delay);
                } else if (retryCount >= MAX_RETRIES) {
                    console.log('Max retry attempts reached. Please restart manually.');
                    retryCount = 0; // Reset for next manual restart
                } else {
                    console.log('Logged out. Manual restart required.');
                    retryCount = 0; // Reset retry count
                }
            }
        });

        sock.ev.on('messages.upsert', (m) => handleWhatsAppUpsert(m, sock));

        console.log('WhatsApp socket initialized successfully');
        return sock;
    } catch (error) {
        console.error('Error starting WhatsApp:', error);
        starting = false; // Reset starting flag on error
        throw error;
    }
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
    } catch (error) {
        console.error('Error during logout:', error);
    }
    try {
        // Clear MongoDB auth state instead of removing file directory
        const authStateManager = await useMongoAuthState(ACCOUNT_ID);
        await authStateManager.clearState();
    } catch (error) {
        console.error('Error clearing auth state:', error);
    }
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
    getPendingQR,
    restartWhatsApp,
    logoutWhatsApp,
    sendTextMessage,
    getSock,
};
