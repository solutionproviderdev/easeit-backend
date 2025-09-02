const {
    getWhatsAppStatus,
    restartWhatsApp,
    logoutWhatsApp,
    sendTextMessage,
    getPendingQR,
} = require('../../services/WhatsApp/whatsappClient');

exports.status = async (req, res, next) => {
    try {
        const data = getWhatsAppStatus();
        res.json({ ok: true, data });
    } catch (err) {
        next(err);
    }
};

exports.restart = async (req, res, next) => {
    try {
        await restartWhatsApp();
        res.json({ ok: true, message: 'Restart triggered' });
    } catch (err) {
        next(err);
    }
};

exports.logout = async (req, res, next) => {
    try {
        await logoutWhatsApp();
        res.json({ ok: true, message: 'Logged out; new QR will be generated' });
    } catch (err) {
        next(err);
    }
};

// send message controller
exports.send = async (req, res, next) => {
    try {
        const { jid, message } = req.body;

        if (!jid || !message) {
            return res.status(400).json({
                ok: false,
                error: 'jid and message are required',
            });
        }

        const data = await sendTextMessage(jid, message);

        res.json({
            ok: true,
            data,
        });
    } catch (err) {
        console.error('[WA Controller] sendTextMessage failed:', err);
        next(err);
    }
};

/** NEW: Get current QR (poll-friendly)
 * If not connected and no QR yet, optionally kick a restart to generate one.
 */
exports.qr = async (req, res, next) => {
    try {
        const { connected, qr } = getPendingQR();

        if (connected) {
            return res.json({ ok: true, connected: true, qr: null });
        }

        // If no QR yet, we can trigger a restart to try and force a fresh QR
        if (!qr) {
            await restartWhatsApp();
            return res.json({
                ok: true,
                connected: false,
                qr: null,
                note: 'Restart triggered. Listen to socket "wa_qr" or poll again.',
            });
        }

        return res.json({ ok: true, connected: false, qr });
    } catch (err) {
        next(err);
    }
};
