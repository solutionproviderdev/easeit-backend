const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
    {
        teamName: {
            type: String,
            required: true,
            unique: true,
        },
        leadMember: {
            memberId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'people',
                required: true,
            },
        },
        supportMember: {
            memberId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'people',
                required: true,
            },
        },
        specializations: [
            {
                type: String,
            },
        ],
        dailyMeetings: [
            {
                date: Date,
                timeSlots: [
                    {
                        slot: {
                            type: String,
                            required: true,
                            enum: ['slot_1', 'slot_2', 'slot_3', 'slot_4'],
                        },
                        status: {
                            type: String,
                            enum: ['Scheduled', 'Rescheduled', 'Completed'],
                        },
                        meeting: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'lead',
                        },
                    },
                ],
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
