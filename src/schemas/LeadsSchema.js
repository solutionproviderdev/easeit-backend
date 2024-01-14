const mongoose = require('mongoose');

const leadSchema = mongoose.Schema(
    {
        CID: String,
        name: { type: String, required: true },
        status: {
            type: String,
            enum: [
                'unread',
                'No Response',
                'Message Rescheduled',
                'Need Support',
                'Number Collected',
                'Call Reschedule',
                'Future Client',
                'Meeting Fixed',
                'Meeting Reschedule',
                'Cancel Meeting',
            ],
            required: true,
            default: 'unread',
        },
        meetingStatus: {
            type: String,
            enum: [
                'Fixed',
                'Cancel Meeting',
                'Rescheduled',
                'In Progress',
                'Complete',
                'Follow up',
                'Success',
                'Need Approval',
            ],
        },
        lastMsg: String,
        fbSenderID: String,
        source: {
            type: String,
            enum: ['Facebook', 'WhatsApp', 'Web', 'By Phone'],
            required: true,
        },
        nextCallData: {
            time: String,
            date: Date,
        },
        nextMsgData: {
            time: String,
            date: String,
        },
        meetingData: [
            {
                time: String,
                date: Date,
            },
        ],
        salesExqName: String,
        phone: String,
        visitCharge: Number,
        comment: [
            {
                images: [String],
                comment: String,
                name: String,
                date: Date,
            },
        ],
        workScope: [
            {
                scope: String,
                sku: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
                sqft: Number,
                price: Number,
            },
        ],
        creName: { type: String, required: true },
        address: String,
        projectStatus: {
            type: String,
            enum: ['Ready', 'Ongoing', 'Recently'],
        },
        projectLocation: {
            type: String,
            enum: ['Inside', 'Outside'],
        },
        positive: Boolean,
        discount: Number,
        projectValue: Number,
        mbSheetNo: String,
        transportCost: Number,
        messages: [
            {
                messageId: String,
                content: String,
                senderId: String,
                sentByMe: { type: Boolean, default: false },
                date: { type: Date },
            },
        ],
        proposals: [{ client: Number, proposal: Number }],
    },
    {
        timestamps: true,
    }
);

const Lead = mongoose.model('lead', leadSchema);

module.exports = Lead;
