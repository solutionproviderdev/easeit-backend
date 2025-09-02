const mongoose = require('mongoose');

// Address Schema
const addressSchema = new mongoose.Schema(
    {
        division: String,
        district: String,
        area: String,
        address: String,
        location: {
            lan: {
                type: String,
            },
            lat: {
                type: String,
            },
        },
    },
    { _id: false }
);

// Message Schema
const messageSchema = new mongoose.Schema(
    {
        messageId: String,
        content: String,
        senderId: String,
        isAutomatedMessage: { type: Boolean, default: false },
        sentByMe: { type: Boolean, default: false },
        fileUrl: [String],
        isSticker: { type: Boolean, default: false },
        isAiMessage: { type: Boolean, default: false },
        date: { type: Date, require: true },
    },
    { _id: true }
);

// Comment Schema
const commentSchema = new mongoose.Schema(
    {
        comment: String,
        commentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        images: [String],
        date: { type: Date, require: true },
    },
    { _id: true, timestamps: true }
);

// Reminder Schema
const reminderSchema = new mongoose.Schema(
    {
        time: { type: Date, required: true }, // Date object to store time
        status: {
            type: String,
            enum: ['Pending', 'Complete', 'Missed', 'Late Complete'],
            default: 'Pending', // Default status is 'Pending'
        },
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false, // Optional field
        },
    },
    { _id: true }
);

const followUpSchema = new mongoose.Schema({
    time: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Complete', 'Missed', 'Late Complete'],
        default: 'Pending',
    },
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Optional field
    },
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    type: { type: String, enam: ['Call', 'Meeting'] },
});

// Call Log Schema
const callLogSchema = new mongoose.Schema(
    {
        recipientNumber: String, // Phone number of the recipient
        callType: {
            type: String,
            enum: ['Incoming', 'Outgoing'], // Only two types of calls
            required: true,
        },
        status: {
            type: String,
            enum: ['Missed', 'Received'], // Indicates whether the call was missed or received
            required: true,
            default: 'Received', // Default to 'Received'
        },
        callDuration: String, // Duration of the call in seconds
        timestamp: { type: Date, required: true }, // Date and time of the call
    },
    { _id: true }
);

// finance Schema
const payment = new mongoose.Schema(
    {
        amount: { type: Number, required: true },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Cheque', 'Bank Transfer', 'Bkash', 'Nagad', 'Rocket', 'SSL E-Commerce'],
            required: true,
        },
        paymentDate: { type: Date, required: true },
        paymentStatus: {
            type: String,
            enum: ['Paid', 'Unpaid'],
            required: true,
            default: 'Unpaid',
        },
        paymentNote: String,
    },
    { _id: true }
);

// finance Schema
const financeSchema = new mongoose.Schema({
    clientsBudget: Number,
    projectValue: Number,
    soldAmmount: Number,
    soldDate: Date, // Date of sale
    totalPayment: Number, // Total amount paid
    totalDue: Number, // Total amount due
    payments: [payment],
});

// Lead Schema
const leadSchema = mongoose.Schema(
    {
        CID: String,
        name: { type: String, required: true },
        status: {
            type: String,
            enum: [
                'New',
                'No Response',
                'Need Support',
                'Message Rescheduled',
                'Number Collected',
                'Call Reschedule',
                'Ongoing',
                'Close',
                'Follow Up',
                'Meeting Fixed',
                'Meeting Complete',
                'Sold',
                'Prospect',
            ],
            required: true,
            default: 'unread',
        },
        address: addressSchema,
        lastMsg: String,
        meetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
        pageInfo: {
            pageId: String,
            pageName: String,
            pageProfilePicture: String,
            fbSenderID: { type: String, sparse: true },
        },
        source: {
            type: String,
            enum: ['Facebook', 'WhatsApp', 'Web', 'Phone'],
            required: true,
        },
        phone: [String], // Array to handle multiple phone numbers
        comment: [commentSchema],
        salesExqName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        creName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        projectStatus: {
            status: {
                type: String,
                enum: ['Ongoing', 'Ready', 'Renovation'],
            },
            subStatus: {
                type: String,
                enum: [
                    'Roof Casting',
                    'Brick Wall',
                    'Plaster',
                    'Pudding',
                    'Two Coat Paint',
                    'Tiles Complete',
                    'Final Paint Done',
                    'Handed Over',
                    'Staying in the Apartment',
                    'Interior Work Complete',
                ],
            },
        },
        projectLocation: {
            type: String,
            enum: ['Inside', 'Outside'],
        },
        reminder: [reminderSchema],
        callLogs: [callLogSchema], // Updated call log schema
        messages: [messageSchema],
        messagesSeen: { type: Boolean, default: false },
        requirements: [String], // New simple array for requirements
        botResponded: { type: Boolean, default: false },

        // firld to traack if the message is replied from system
        repliedFromSystem: { type: Boolean, default: false },

        // field to track when the lead was last assigned
        lastAssigned: { type: Date, default: Date.now },

        // field for product ad relations:
        productAds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductAd' }],

        // new field for sales Follow Up.
        salesFollowUp: [followUpSchema],

        // new field for Finance
        finance: financeSchema,

        // new field to track auto message sent count
        autoMessageSentCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

// Compound and Single Field Indexes

// Index for CID and status queries
leadSchema.index({ CID: 1, status: 1 });

// Index for sales executive and status
leadSchema.index({ salesExqName: 1, status: 1 });

// Index for customer relationship executive
leadSchema.index({ creName: 1 });

// Index for source and status based queries
leadSchema.index({ source: 1, status: 1 });

// Index for phone number searches
leadSchema.index({ phone: 1 });

// Index for Facebook sender ID (sparse to handle null values)
leadSchema.index({ 'pageInfo.fbSenderID': 1 }, { sparse: true });

// Index for project status queries
leadSchema.index({ 'projectStatus.status': 1, 'projectStatus.subStatus': 1 });

// Index for message management
leadSchema.index({ messagesSeen: 1, botResponded: 1 });

// Index for finance-related queries
leadSchema.index({ 'finance.soldDate': 1, 'finance.soldAmmount': 1 });
leadSchema.index({ 'finance.totalDue': 1 });

// Index for follow-ups and reminders
leadSchema.index({ 'salesFollowUp.time': 1, 'salesFollowUp.status': 1 });
leadSchema.index({ 'reminder.time': 1, 'reminder.status': 1 });

// Text index for search across multiple fields
leadSchema.index(
    {
        name: 'text',
        'address.area': 'text',
        'address.address': 'text',
        lastMsg: 'text',
    },
    {
        weights: {
            name: 10,
            'address.area': 5,
            'address.address': 3,
            lastMsg: 1,
        },
    }
);

// Timestamp based index for recent activities
leadSchema.index({ createdAt: -1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ lastAssigned: -1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
