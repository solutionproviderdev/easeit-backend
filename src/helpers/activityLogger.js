// helpers/activityLogger.js

const ActivityLog = require("../schemas/ActivityLogSchema");


/**
 * Writes an activity log without crashing the app.
 * @param {ObjectId} userId   – who performed the action
 * @param {string}   action   – one of your enum actions
 * @param {object}   details  – extra context (e.g. leadId, from/to)
 */
async function log(userId, action, details = {}) {
    try {
        await ActivityLog.create({ userId, action, details });
        console.log(`Activity logged: ${action} by user ${userId}`);
    } catch (err) {
        console.error('ActivityLog error:', err);
    }
}

module.exports = { log };
