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

/* =======================
   Logging Middleware
   ======================= */

// CREATE / SAVE (doc.save())
activityLogSchema.post('save', (doc) => {
    if (doc.isNew) {
        console.log('[ActivityLog] CREATE:', {
            _id: doc._id.toString(),
            action: doc.action,
            userId: doc.userId?.toString(),
            details: doc.details,
            ts: doc.timestamp,
        });
    } else {
        console.log('[ActivityLog] UPDATE (via save):', {
            _id: doc._id.toString(),
            action: doc.action,
            userId: doc.userId?.toString(),
            details: doc.details,
            ts: doc.timestamp,
        });
    }
});

// BULK CREATE (Model.insertMany)
activityLogSchema.post('insertMany', (docs) => {
    console.log('[ActivityLog] INSERT MANY:', {
        count: docs?.length || 0,
        ids: (docs || []).map((d) => d._id.toString()),
    });
});

// UPDATE-STYLE QUERIES
// Model.updateOne(filter, update)
activityLogSchema.post('updateOne', function (res) {
    // 'this' is the query
    console.log('[ActivityLog] UPDATE ONE:', {
        filter: this.getFilter?.(),
        update: this.getUpdate?.(),
        result: res,
    });
});

// Model.updateMany(filter, update)
activityLogSchema.post('updateMany', function (res) {
    console.log('[ActivityLog] UPDATE MANY:', {
        filter: this.getFilter?.(),
        update: this.getUpdate?.(),
        result: res,
    });
});

// Model.findOneAndUpdate(filter, update, opts)
activityLogSchema.pre('findOneAndUpdate', function () {
    // stash update for logging in post hook
    this._updateForLog = this.getUpdate?.();
});
activityLogSchema.post('findOneAndUpdate', function (doc) {
    console.log('[ActivityLog] FIND ONE AND UPDATE:', {
        filter: this.getFilter?.(),
        update: this._updateForLog,
        updatedId: doc?._id?.toString(),
    });
    this._updateForLog = undefined;
});

// DELETE-STYLE QUERIES
// doc.deleteOne()
activityLogSchema.post('deleteOne', { document: true, query: false }, function () {
    console.log('[ActivityLog] DELETE DOC (document.deleteOne):', {
        _id: this._id.toString(),
    });
});

// Model.deleteOne(filter)
activityLogSchema.post('deleteOne', { document: false, query: true }, function (res) {
    console.log('[ActivityLog] DELETE ONE (by filter):', {
        filter: this.getFilter?.(),
        result: res,
    });
});

// Model.deleteMany(filter)
activityLogSchema.post('deleteMany', function (res) {
    console.log('[ActivityLog] DELETE MANY:', {
        filter: this.getFilter?.(),
        result: res,
    });
});

// Model.findOneAndDelete(filter)
activityLogSchema.post('findOneAndDelete', function (doc) {
    console.log('[ActivityLog] FIND ONE AND DELETE:', {
        filter: this.getFilter?.(),
        deletedId: doc?._id?.toString(),
    });
});

// (Optional) Model.findByIdAndDelete is an alias of findOneAndDelete; covered above.

/* =======================
   Model
   ======================= */
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
