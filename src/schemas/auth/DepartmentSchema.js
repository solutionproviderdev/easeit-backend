// models/Department.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

const roleSchema = new Schema({
    roleId: Schema.Types.ObjectId,
    roleName: { type: String, required: true },
    description: { type: String },
    permissions: [
        {
            resource: { type: String, required: true },
            action: { type: String, required: true },
        },
    ],
});

const departmentSchema = new Schema({
    departmentName: { type: String, required: true },
    description: { type: String },
    roles: [roleSchema],
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
