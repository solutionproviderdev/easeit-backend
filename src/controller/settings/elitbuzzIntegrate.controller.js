const axios = require('axios');
const Settings = require('../../schemas/SettingsSchema');

async function createOrGetElitbuzzConfig() {
    let doc = await Settings.findOne({ name: 'elitbuzzIntegrate' });
    if (!doc) {
        doc = new Settings({
            name: 'elitbuzzIntegrate',
            settingsData: { apiSecret: '', senderId: '' },
        });
        await doc.save();
    }
    return doc;
}

/**
 * Parse "Your Balance is:BDT 470.44" → 470.44 (Number)
 */
function parseBalance(text) {
    if (typeof text !== 'string') return null;
    const m = text.match(/([\d]+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
}

/**
 * Call Elitbuzz balance API. Returns { raw, value } where value is Number or null.
 */
async function getCurrentBalance(apiKey) {
    if (!apiKey) return { raw: null, value: null };
    const url = `https://msg.elitbuzz-bd.com/miscapi/${encodeURIComponent(apiKey)}/getBalance`;
    const { data } = await axios.get(url, {
        timeout: 10000,
        responseType: 'text',
    });
    const value = parseBalance(data);
    return { raw: String(data), value };
}

/**
 * Update doc.settingsData.balance and .balanceUpdatedAt if fetch succeeds.
 * Never throws—safe to call during GET/POST flows.
 */
async function updateDocBalance(doc) {
    try {
        const apiKey = doc?.settingsData?.apiSecret;
        if (!apiKey) return doc; // nothing to do

        const { raw, value } = await getCurrentBalance(apiKey);
        if (raw != null) {
            // store both human-readable and numeric
            doc.settingsData.balanceText = raw; // e.g., "Your Balance is:BDT 470.44"
            doc.settingsData.balance = value; // e.g., 470.44
            doc.settingsData.balanceUpdatedAt = new Date().toISOString();
            doc.markModified('settingsData');
            await doc.save();
        }
        return doc;
    } catch (e) {
        // swallow errors so reads/writes don’t fail due to balance check
        return doc;
    }
}

// ------------------------------------
// Exported handlers
// ------------------------------------

exports.getElitbuzzIntegrate = async (req, res) => {
    try {
        let doc = await createOrGetElitbuzzConfig();
        // Update balance on read
        doc = await updateDocBalance(doc);
        // Return the freshest version
        const fresh = await Settings.findById(doc._id);
        return res.json(fresh);
    } catch {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.createElitbuzzIntegration = async (req, res) => {
    try {
        const { apiSecret, senderId } = req.body;
        const doc = await createOrGetElitbuzzConfig();

        // Update nested fields on Mixed + mark modified
        doc.settingsData.apiSecret = apiSecret;
        doc.settingsData.senderId = senderId;
        doc.markModified('settingsData');
        await doc.save();

        // Immediately refresh balance after credentials change
        await updateDocBalance(doc);

        const fresh = await Settings.findById(doc._id);
        return res.json(fresh);
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { message, contacts, type = 'text', label, senderid } = req.body;

        const cfg = await createOrGetElitbuzzConfig();
        const { apiSecret, senderId: defaultSender } = cfg.settingsData || {};
        if (!apiSecret) return res.status(400).json({ message: 'Elitbuzz API key not set' });

        // Normalize contacts: support array or string (joined by '+')
        let contactsStr;
        if (Array.isArray(contacts)) contactsStr = contacts.join('+');
        else if (typeof contacts === 'string') contactsStr = contacts.trim();
        else return res.status(400).json({ message: 'contacts must be string or array' });

        const form = new URLSearchParams({
            api_key: apiSecret,
            type, // text | unicode
            contacts: contactsStr,
            senderid: senderid || defaultSender,
            msg: message,
        });
        if (label) form.append('label', label);

        const { data } = await axios.post('https://msg.elitbuzz-bd.com/smsapi', form, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000,
        });

        // Optionally refresh balance after sending (comment out if you prefer not to)
        await updateDocBalance(cfg);

        return res.json(data);
    } catch (error) {
        if (error.response?.data) {
            return res.status(502).json({ message: 'Elitbuzz error', data: error.response.data });
        }
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Export the helper if you want to reuse elsewhere
exports.getCurrentBalance = getCurrentBalance;
