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
            enum: [],
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

// Define roles based on the selected department
const rolesByDepartment = {
    CRE: ['CRE Head', 'CRE'],
    Sales: ['Sales Head', 'Seals Executive'],
    IT: ['Graphics Designer', 'Developer'],
    Management: ['Operation Manager', 'Manager', 'Assistant Manager'],
};

// Set roles based on the selected department
// eslint-disable-next-line func-names
peopleSchema.pre('save', function (next) {
    if (this.isModified('department')) {
        // eslint-disable-next-line prefer-destructuring
        this.role = rolesByDepartment[this.department][0];
    }
    next();
});

// eslint-disable-next-line new-cap
const People = new mongoose.model('people', peopleSchema);
module.exports = People;
