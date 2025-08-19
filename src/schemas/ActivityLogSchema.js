const mongoose = require('mongoose');

const { Schema } = mongoose;

const ACTIONS = [
	'CREATE_LEAD',
	'LEAD_STATUS_CHANGE',
	'LEAD_MEETING_SET',
	'LEAD_REMINDER_SET',
	'LEAD_REMINDER_UPDATE',
	'LEAD_ADD_COMMENT',
];

const activityLogSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	action: { type: String, enum: ACTIONS, required: true },
	timestamp: { type: Date, default: Date.now, expires: '60d' },
	details: { type: Schema.Types.Mixed },
});
// ————————————————————————————————————————————————————————
// Indexes
// 1. Fast lookup of “what this user did most recently”
// 2. Fast lookup of all events on a given lead
// 3. (Optionally) Global sort by timestamp
// ————————————————————————————————————————————————————————
activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ 'details.viewedUserId': 1, action: 1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ 'details.leadId': 1, action: 1 });
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
