/* eslint-disable no-restricted-syntax */
const permissionsData = require('../../routes/auth/permissionsData');
const ActivityLog = require('../../schemas/ActivityLogSchema');
const Department = require('../../schemas/auth/DepartmentSchema');
const User = require('../../schemas/auth/UserSchema');

// Create a new department function
exports.createDepartment = async (req, res) => {
    try {
        const { departmentName, description, roles } = req.body;

        // Check if department already exists
        let department = await Department.findOne({ departmentName });
        if (department) {
            return res.status(400).json({ msg: 'Department already exists' });
        }

        // Create a new department, roles are optional
        department = new Department({
            departmentName,
            description,
            roles: roles || [], // Set roles to an empty array if not provided
        });

        // Save the department
        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user._id,
            action: 'Created Department',
            details: { departmentName },
        });

        res.status(201).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get all departments function with staff count
exports.getAllDepartments = async (req, res) => {
    try {
        // Fetch all departments
        const departments = await Department.find();

        // Create an array of promises to fetch the staff count for each department
        const departmentsWithStaffCount = await Promise.all(
            departments.map(async (department) => {
                // Count the number of users in each department
                const staffCount = await User.countDocuments({ departmentId: department._id });

                return {
                    ...department.toObject(),
                    staffCount, // Add the staff count to each department object
                };
            })
        );

        res.status(200).json(departmentsWithStaffCount);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get single department by ID function
exports.getDepartmentById = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }
        res.status(200).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update department function
exports.updateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }

        const updateFields = {
            departmentName: req.body.departmentName,
            description: req.body.description,
            roles: req.body.roles,
        };

        // Update department fields
        for (const [key, value] of Object.entries(updateFields)) {
            if (value !== undefined) {
                department[key] = value;
            }
        }

        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Updated Department',
            details: { departmentId: department._id },
        });

        res.status(200).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Delete department function
exports.deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }

        // Delete the department
        await Department.deleteOne({ _id: req.params.id });

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Deleted Department',
            details: { departmentId: department._id },
        });

        res.status(200).json({ msg: 'Department deleted' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Add role to department function
exports.addRoleToDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }

        const { roleName, description, permissions } = req.body;

        // Add the new role to the department
        const newRole = {
            roleName,
            description,
            permissions, // Permissions now include array of resources and actions
        };

        department.roles.push(newRole);
        await department.save();

        res.status(200).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Update role in department function
exports.updateRoleInDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }

        const { roleName, description, permissions } = req.body;
        const { roleId } = req.params;

        // Find the role in the department
        const role = department.roles.id(roleId);
        if (!role) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        // Update the role fields
        if (roleName) role.roleName = roleName;
        if (description) role.description = description;
        if (permissions) role.permissions = permissions; // Update permissions too

        await department.save();

        res.status(200).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Delete role from department function
exports.deleteRoleFromDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ msg: 'Department not found' });
        }

        // Find the role in the department
        const role = department.roles.id(req.params.roleId);
        if (!role) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        // Remove the role from the department
        department.roles.pull(req.params.roleId);
        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Deleted Role from Department',
            details: { departmentId: department._id, roleId: req.params.roleId },
        });

        res.status(200).json({ msg: 'Role deleted from department' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Controller function to get all permissions data
exports.getAllPermissions = (req, res) => {
    try {
        res.status(200).json(permissionsData);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// // Update permissions for a specific role in a department function
// exports.updateRolePermissions = async (req, res) => {
//     try {
//         const department = await Department.findById(req.params.id);
//         if (!department) {
//             return res.status(404).json({ msg: 'Department not found' });
//         }

//         const { permissions } = req.body;
//         const { roleId } = req.params;

//         // Find the role in the department
//         const role = department.roles.id(roleId);
//         if (!role) {
//             return res.status(404).json({ msg: 'Role not found' });
//         }

//         // Update permissions for the role
//         if (permissions) role.permissions = permissions; // Handle the updated permissions array

//         await department.save();

//         // Log activity
//         await ActivityLog.create({
//             userId: req.user.id,
//             action: 'Updated Role Permissions',
//             details: { departmentId: department._id, roleId },
//         });

//         res.status(200).json(department);
//     } catch (error) {
//         console.error(error.message);
//         res.status(500).json({ msg: 'Server error' });
//     }
// };
