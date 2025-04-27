const mongoose = require('mongoose');

// Define Meeting Schema
const meetingSchema = new mongoose.Schema(
    {
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead', // Reference to the Lead collection
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        slot: {
            type: String,
            required: true,
            enum: [
                '10:00 AM',
                '11:00 AM',
                '12:00 PM',
                '01:00 PM',
                '02:00 PM',
                '03:00 PM',
                '04:00 PM',
                '05:00 PM',
                '06:00 PM',
                '07:00 PM',
                '08:00 PM',
                '09:00 PM',
                '10:00 PM',
                '11:00 PM',
                '12:00 AM',
                '01:00 AM',
                '02:00 AM',
                '03:00 AM',
                '04:00 AM',
                '05:00 AM',
                '06:00 AM',
                '07:00 AM',
                '08:00 AM',
                '09:00 AM',
            ],
        },
        salesExecutive: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Reference to the User collection (salesperson responsible)
            required: true,
        },
        status: {
            type: String,
            enum: [
                'Fixed',
                'Postponed',
                'Rescheduled',
                'Canceled',
                'Complete',
                'Sold',
                'Follow-Up',
                'Final Measurement',
                'Handover & Review',
            ],

            required: true,
            default: 'Meeting Fixed',
        },
        visitCharge: {
            type: Number, // No need for currency since it is always in BDT
        },
        auditFields: {
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },
        locations: {
            leavingFrom: {
                lan: {
                    type: String,
                },
                lat: {
                    type: String,
                },
                time: {
                    type: Date,
                },
            },
            arrivedAt: {
                lan: {
                    type: String,
                },
                lat: {
                    type: String,
                },
                time: {
                    type: Date,
                },
            },
        },
        meetingFlowStatus: {
            type: String,
            enum: ['Confirmed', 'Leaved', 'Arrived', 'Ongoing', 'Completed', 'Canceled'],
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

// Middleware to auto-populate the 'lead' field
meetingSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'lead',
        select: '-__v -messages',
    });
    next();
});

// Compound and Single Field Indexes
// Index for date-based queries with status
meetingSchema.index({ date: 1, status: 1 });

// Index for sales executive queries with date
meetingSchema.index({ salesExecutive: 1, date: 1 });

// Index for lead-based queries
meetingSchema.index({ lead: 1 });

// Index for status-based queries with date
meetingSchema.index({ status: 1, date: 1 });

// Index for audit fields
meetingSchema.index({ 'auditFields.createdBy': 1 });
meetingSchema.index({ 'auditFields.updatedBy': 1 });

// Index for date range queries with slot
meetingSchema.index({ date: 1, slot: 1 });

// Text index for potential text search
meetingSchema.index({ status: 'text' });

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
