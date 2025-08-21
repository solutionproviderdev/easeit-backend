// helpers/activityLogger.js

const User = require('../schemas/auth/UserSchema');
const ActivityLog = require('../schemas/ActivityLogSchema');

/**
 * Writes an activity log without crashing the app.
 * @param {ObjectId} userId   – who performed the action
 * @param {string}   action   – one of your enum actions
 * @param {object}   details  – extra context (e.g. leadId, from/to)
 */
async function log(userId, action, details = {}) {
    try {
        // Save to global ActivityLog collection
        await ActivityLog.create({ userId, action, details });

        // Save to user's activityLog array
        await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    activityLog: {
                        date: new Date(),
                        activity: action,
                        details, // optional: add details if you want
                    },
                },
            },
            { new: true }
        );

        console.log(`Activity logged: ${action} by user ${userId}`);
    } catch (err) {
        console.error('ActivityLog error:', err);
    }
}

module.exports = { log };
