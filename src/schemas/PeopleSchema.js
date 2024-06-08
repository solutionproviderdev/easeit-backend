// models/People.js
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
            required: true,
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
        image: {
            type: String,
            required: true,
        },
        nid: String,
    },
    { timestamps: true }
);

const People = mongoose.model('People', peopleSchema);
module.exports = People;
