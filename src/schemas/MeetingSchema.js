
const mongoose = require('mongoose');

// Unified Meeting Schema
const meetingSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
    },
    leadName: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true, // Title of the meeting
    },
    date: {
        type: Date,
        required: true, // Date of the meeting
    },
    time: {
        type: String, // Can be '09:00 AM' format or ISO string
        required: true,
    },
    salesTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the sales team member involved
        required: true,
    },
    location: {
        type: String,
        enum: ['Inside', 'Outside'],
        required: true, // Location of the project
    },
    projectStatus: {
        type: String,
        enum: ['Ongoing', 'Complete', 'Pending', 'Canceled'],
        required: true, // Status of the project related to the meeting
    },
    phone: {
        type: String, // Phone number of the lead or client
        required: true,
    },
    requirement: {
        type: String, // Requirement of the meeting (e.g., 'Kitchen', 'Bathroom')
        required: true,
    },
    cre: {
        type: mongoose.Schema.Types.ObjectId,
        enum: ['Facebook', 'WhatsApp', 'Phone'],
        ref: 'User', // CRE responsible for the lead
    },
    source: {
        type: String,
        enum: ['Facebook', 'WhatsApp', 'Phone'],
        required: true, // Source of the lead
    },
    visitCharge: {
        type: String, // Visit charge, if applicable
        required: false,
    },
    rating: {
        type: String, // Rating for the lead or project
        default: '☆☆☆☆☆',
    },
    remarks: {
        type: String, // Remarks for the meeting or lead
        default: '',
    },
    status: {
        type: String,
        enum: ['Pending', 'Complete', 'Rescheduled', 'Canceled'],
        default: 'Pending', // Status of the meeting
    },
    salesFinal: {
        type: String,
        enum: ['Prospect', 'Done', 'Follow Up', 'Closed'], // Enum for sales status
        default: 'Prospect', // Default sales state
    },
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

// Create the Meeting model
const Meeting = mongoose.model('Meeting', meetingSchema);
module.exports = Meeting;
