const express = require('express');
const {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    addRoleToDepartment,
    updateRoleInDepartment,
    deleteRoleFromDepartment,
    updateRolePermissions,
    getAllPermissions,
    initializeDefaultDepartments,
} = require('../../controller/auth/departmentController');
const {
    validateDepartment,
    validateDepartmentUpdate,
    validateRole,
    validateRoleUpdate,
    validatePermissions,
} = require('../../validators/departmentValidator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

// Router Declaration
const departmentRouter = express.Router();

// Get All Departments
departmentRouter.get('/', checkAuth, getAllDepartments);

// Route to get all permissions data
departmentRouter.get('/permissions', checkAuth, getAllPermissions);

// Get Single Department
departmentRouter.get('/:id', checkAuth, getDepartmentById);

// Create a New Department
departmentRouter.post('/', checkAuth, validateDepartment, createDepartment);

// Update Department Details
departmentRouter.put('/:id', checkAuth, validateDepartmentUpdate, updateDepartment);

// Delete a Department
departmentRouter.delete('/:id', checkAuth, deleteDepartment);

// Add Role to Department
departmentRouter.post('/:id/roles', checkAuth, validateRole, addRoleToDepartment);

// Update Role in Department
departmentRouter.put('/:id/roles/:roleId', checkAuth, validateRoleUpdate, updateRoleInDepartment);

// Delete Role from Department
departmentRouter.delete('/:id/roles/:roleId', checkAuth, deleteRoleFromDepartment);

// // New Route for updating role permissions
// departmentRouter.put(
//     '/:id/roles/:roleId/permissions',
//     checkAuth,
//     validatePermissions,
//     updateRolePermissions
// );

initializeDefaultDepartments();

module.exports = departmentRouter;
