const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        division: String,
        district: String,
        area: String,
        address: String,
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        messageId: String,
        content: String,
        senderId: String,
        sentByMe: { type: Boolean, default: false },
        fileUrl: [String],
        isSticker: { type: Boolean, default: false },
        date: { type: Date, require: true },
    },
    { _id: true }
);

const meetingDetailsSchema = new mongoose.Schema(
    {
        date: Date,
        slot: {
            type: String,
            enum: ['slot_1', 'slot_2', 'slot_3', 'slot_4'],
            required: true,
        },
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
        },
    },
    { _id: false }
);

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
        address: addressSchema,
        meetingDetails: [meetingDetailsSchema],
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
        fbSenderID: {
            type: String,
            unique: true,
        },
        source: {
            type: String,
            enum: ['Facebook', 'WhatsApp', 'Web', 'By Phone'],
            required: true,
        },
        nextCallData: Date,
        nextMsgData: Date,
        meetingData: [
            {
                time: String,
                date: Date,
            },
        ],
        phone: String,
        visitCharge: Number,
        comment: [
            {
                comment: String,
                images: [String],
                from: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'people',
                },
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
        sourcePageName: String,
        sourcePageId: String,
        sourcePageProfilePicture: String,
        salesExqName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'people',
        },
        creName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'people',
        },
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
        messages: [messageSchema],
        proposals: [{ client: Number, proposal: Number }],
        tags: [String],
    },
    {
        timestamps: true,
    }
);

const Lead = mongoose.model('lead', leadSchema);

module.exports = Lead;
