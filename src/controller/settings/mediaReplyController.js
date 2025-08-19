const MediaReplySettingsSchema = require('../../schemas/settings/MediaReplySettingsSchema');

// GET global media reply settings (Admin only)
exports.getMine = async (req, res) => {
    if (req.user.type !== 'Admin') {
        return res
            .status(403)
            .json({ msg: 'Forbidden: Only Admins can manage media reply settings.' });
    }
    const doc = await MediaReplySettingsSchema.findOne({})
        .populate('image.savedId')
        .populate('audio.savedId')
        .populate('video.savedId')
        .populate('image.aiModel')
        .populate('audio.aiModel')
        .populate('video.aiModel')
        .lean();
    res.json(doc || { image: {}, audio: {}, video: {} });
};

// UPDATE global media reply settings (Admin only)
exports.updateMine = async (req, res) => {
    if (req.user.type !== 'Admin') {
        return res
            .status(403)
            .json({ msg: 'Forbidden: Only Admins can manage media reply settings.' });
    }

    // Whitelist and sanitize input
    const allowed = {};
    ['image', 'audio', 'video'].forEach((k) => {
        if (req.body[k]) {
            const v = req.body[k];
            allowed[k] = {};
            if ('enabled' in v) allowed[k].enabled = !!v.enabled;
            if ('aiEnabled' in v) allowed[k].aiEnabled = !!v.aiEnabled;
            if ('aiModel' in v) allowed[k].aiModel = v.aiModel || null;
            if ('savedMessageEnabled' in v) allowed[k].savedMessageEnabled = !!v.savedMessageEnabled;
            if ('savedId' in v) allowed[k].savedId = v.savedId || null;
        }
    });

    const doc = await MediaReplySettingsSchema.findOneAndUpdate(
        {},
        { $set: allowed },
        { upsert: true, new: true, runValidators: true }
    )
        .populate('image.savedId')
        .populate('audio.savedId')
        .populate('video.savedId')
        .populate('image.aiModel')
        .populate('audio.aiModel')
        .populate('video.aiModel')
        .lean();

    res.json(doc);
};
