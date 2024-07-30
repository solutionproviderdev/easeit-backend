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

const commentSchema = new mongoose.Schema({
    comment: String,
    commentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    images: [String],
    date: { type: Date, require: true },
});

const workScopeSchema = new mongoose.Schema(
    {
        scope: String,
        sku: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        squareFeet: Number,
    },
    { _id: true }
);

const reminderSchema = new mongoose.Schema(
    {
        reminder: String,
        date: { type: Date, require: true },
        time: { type: Date, require: true },
    },
    { _id: true }
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
                'Follow Up',
                'Meeting Fixed',
                'Meeting Reschedule',
                'Cancel Meeting',
            ],
            required: true,
            default: 'unread',
        },
        address: addressSchema,
        meetingDetails: [meetingDetailsSchema],
        lastMsg: String,
        fbSenderID: {
            type: String,
            unique: true,
        },
        source: {
            type: String,
            enum: ['Facebook', 'WhatsApp', 'Web', 'Phone'],
            required: true,
        },
        meetingData: [
            {
                time: String,
                date: Date,
            },
        ],
        phone: String,
        comment: [commentSchema],
        workScope: [workScopeSchema],
        pageInfo: {
            pageId: String,
            pageName: String,
            pageProfilePicture: String,
        },
        salesExqName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        creName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        projectStatus: {
            type: String,
            enum: ['Ready', 'Ongoing', 'Recently'],
        },
        projectLocation: {
            type: String,
            enum: ['Inside', 'Outside'],
        },
        reminder: [reminderSchema],
        positive: Boolean,
        discount: Number,
        projectValue: Number,
        mbSheetNo: String,
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
