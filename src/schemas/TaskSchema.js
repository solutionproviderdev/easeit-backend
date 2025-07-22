const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
        creId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['New', 'Hot', 'Cold', 'Previous Reply', 'Follow Up', 'Expiring Soon'],
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
            default: 'Pending',
        },
        assignedAt: { type: Date, default: Date.now },
        startedAt: { type: Date },
        completedAt: { type: Date },
        meta: {
            createdDueTo: String, // 'client_message', 'reminder', 'new_lead'
            autoMovedAt: Date,
            wasMovedFrom: String, // e.g. 'Hot'
        },
    },
    { timestamps: true }
);

taskSchema.index({ leadId: 1, status: 1 });
taskSchema.index({ creId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
