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
} = require('../../controller/auth/departmentController');
const {
    validateDepartment,
    validateDepartmentUpdate,
    validateRole,
    validateRoleUpdate,
} = require('../../validators/departmentValidator');
const { checkAuth } = require('../../middlewares/auth/checkLoginCookie');

// Router Declaration
const departmentRouter = express.Router();

// Get All Departments
departmentRouter.get('/', checkAuth, getAllDepartments);

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

module.exports = departmentRouter;
