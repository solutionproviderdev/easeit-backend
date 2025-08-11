const mongoose = require('mongoose');
const SavedMessage = require('../../schemas/settings/SavedMessage.Schema');

// Helpers
const pick = (obj, fields) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => fields.includes(k)));

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// CREATE
exports.createSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { title = '', message, tags = [] } = req.body;

        if (!message?.trim()) return res.status(400).json({ msg: 'message is required' });

        const doc = await SavedMessage.create({
            createdBy: userId,
            title: title?.trim(),
            message: message.trim(),
            tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
        });

        return res.status(201).json({
            _id: doc._id,
            title: doc.title,
            message: doc.message,
            tags: doc.tags,
            createdAt: doc.createdAt,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to create' });
    }
};

// LIST (cursor pagination)
exports.listSavedMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 20, after, tag, q, active = 'true' } = req.query;

        const lim = Math.min(Number(limit) || 20, 100);

        const filter = { createdBy: userId };
        if (active !== 'all') filter.isActive = active === 'true';
        if (tag) filter.tags = tag;
        if (after) filter._id = { $lt: toObjectId(after) };

        let projection = {
            title: 1,
            message: 1,
            tags: 1,
            createdAt: 1,
            isActive: 1,
        };
        let sort = { _id: -1 };

        if (q?.trim()) {
            filter.$text = { $search: q.trim() };
            projection = { ...projection, score: { $meta: 'textScore' } };
            sort = { score: { $meta: 'textScore' }, _id: -1 };
        }

        const rows = await SavedMessage.find(filter)
            .select(projection)
            .sort(sort)
            .limit(lim + 1)
            .lean();

        const hasMore = rows.length > lim;
        const data = hasMore ? rows.slice(0, lim) : rows;

        return res.json({
            data,
            nextCursor: hasMore ? String(data[data.length - 1]._id) : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to list' });
    }
};

// GET ONE
exports.getSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const doc = await SavedMessage.findOne({ _id: id, createdBy: userId })
            .select({
                title: 1,
                message: 1,
                tags: 1,
                createdAt: 1,
                updatedAt: 1,
                isActive: 1,
            })
            .lean();

        if (!doc) return res.status(404).json({ msg: 'Not found' });
        return res.json(doc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to fetch' });
    }
};

// UPDATE
exports.updateSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const allowed = pick(req.body, ['title', 'message', 'tags', 'isActive']);
        if ('message' in allowed && !allowed.message?.trim())
            return res.status(400).json({ msg: 'message cannot be empty' });

        if ('title' in allowed) allowed.title = allowed.title?.trim();
        if ('message' in allowed) allowed.message = allowed.message.trim();
        if ('tags' in allowed && Array.isArray(allowed.tags))
            allowed.tags = allowed.tags.slice(0, 20);

        const doc = await SavedMessage.findOneAndUpdate(
            { _id: id, createdBy: userId },
            { $set: allowed },
            {
                new: true,
                runValidators: true,
                projection: {
                    title: 1,
                    message: 1,
                    tags: 1,
                    isActive: 1,
                    updatedAt: 1,
                },
            }
        ).lean();

        if (!doc) return res.status(404).json({ msg: 'Not found' });
        return res.json(doc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to update' });
    }
};

// SOFT DELETE
exports.softDeleteSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await SavedMessage.updateOne(
            { _id: id, createdBy: userId, isActive: true },
            { $set: { isActive: false } }
        );

        if (!result.matchedCount && !result.modifiedCount)
            return res.status(404).json({ msg: 'Not found or already inactive' });

        return res.json({ msg: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to delete' });
    }
};

// RESTORE
exports.restoreSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await SavedMessage.updateOne(
            { _id: id, createdBy: userId, isActive: false },
            { $set: { isActive: true } }
        );

        if (!result.matchedCount && !result.modifiedCount)
            return res.status(404).json({ msg: 'Not found or already active' });

        return res.json({ msg: 'Restored' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to restore' });
    }
};

// HARD DELETE (admin only)
exports.harddeleteSavedMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await SavedMessage.deleteOne({ _id: id, createdBy: userId });
        if (!result.deletedCount) return res.status(404).json({ msg: 'Not found' });

        return res.json({ msg: 'Removed permanently' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to remove' });
    }
};
