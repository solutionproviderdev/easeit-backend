/* eslint-disable no-restricted-syntax */
const ActivityLog = require('../../schemas/ActivityLogSchema');
const Department = require('../../schemas/auth/DepartmentSchema');

// Create a new department function

exports.createDepartment = async (req, res) => {
    try {
        const { departmentName, description, roles } = req.body;

        // Check if department already exists
        let department = await Department.findOne({ departmentName });
        if (department) {
            return res.status(400).json({ msg: 'Department already exists' });
        }

        // Create a new department
        department = new Department({
            departmentName,
            description,
            roles,
        });

        // Save the department
        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Created Department',
            details: { departmentName },
        });

        res.status(201).json(department);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get all departments function
exports.getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.status(200).json(departments);
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
            permissions,
        };

        department.roles.push(newRole);
        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Added Role to Department',
            details: { departmentId: department._id, roleName },
        });

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
        if (permissions) role.permissions = permissions;

        await department.save();

        // Create an activity log entry
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Updated Role in Department',
            details: { departmentId: department._id, roleId },
        });

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
