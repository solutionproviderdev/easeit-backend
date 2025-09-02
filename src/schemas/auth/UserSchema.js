// models/User.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
    nameAsPerNID: { type: String, required: true },
    nickname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    personalPhone: { type: String, required: true },
    officePhone: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    address: { type: String, required: true },
    profilePicture: { type: String },
    coverPhoto: { type: String },
    password: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    roleId: { type: Schema.Types.ObjectId },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    type: { type: String, enum: ['Admin', 'Operator'], required: true },
    accessLevel: { type: [String] },
    joiningDate: { type: Date },
    currentSalary: { type: Number },
    workingProcedure: { type: String },
    documents: {
        resume: { type: String },
        nidCopy: { type: String },
        academicDocument: { type: String },
        bankAccountNumber: { type: String },
        agreement: { type: String },
    },
    activityLog: [
        {
            date: { type: Date, default: Date.now },
            activity: { type: String },
        },
    ],
    socialLinks: [
        {
            platform: { type: String },
            link: { type: String },
        },
    ],
    guardian: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relation: { type: String, required: true },
    },

    // to store device tokens
    deviceTokens: {
        type: [String],
        default: [],
    },
    mobileDeviceToken: {
        type: String,
        default: '',
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
