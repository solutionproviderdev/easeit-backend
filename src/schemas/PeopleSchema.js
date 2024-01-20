const mongoose = require('mongoose');

const peopleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        NIDNumber: {
            type: String,
            required: true,
        },
        active: {
            type: Boolean,
            require: true,
            default: true,
        },
        address: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        department: {
            type: String,
            enum: ['CRE', 'Sales', 'IT', 'Management'],
            required: true,
        },
        status: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
        },
        avater: String,
        nid: String,
    },
    { timestamps: true }
);

// eslint-disable-next-line new-cap
const People = new mongoose.model('people', peopleSchema);
module.exports = People;
