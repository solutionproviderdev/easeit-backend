const mongoose = require('mongoose');

const { Schema } = mongoose;

// Define the Role schema inside the department
const roleSchema = new Schema({
    roleId: Schema.Types.ObjectId,
    roleName: { type: String, required: true },
    description: { type: String },
    // Permissions as an array of resources, each containing multiple actions
    permissions: [
        {
            resource: { type: String, required: true }, // E.g., 'Dashboard', 'Analytics'
            actions: [
                {
                    name: { type: String, required: true },
                    allowed: { type: Boolean, default: false },
                },
            ],
        },
    ],
});

// Define the Department schema with roles
const departmentSchema = new Schema({
    departmentName: { type: String, required: true },
    description: { type: String },
    roles: [roleSchema], // Array of roles within the department
});

// Create the Department model
const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
