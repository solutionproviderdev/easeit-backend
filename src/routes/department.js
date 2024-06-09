const express = require('express');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    addRoleToDepartment,
    updateRoleInDepartment,
    deleteRoleFromDepartment,
} = require('../controller/auth/departmentController');
const {
    validateDepartment,
    validateDepartmentUpdate,
    validateRole,
    validateRoleUpdate,
} = require('../validators/departmentValidator');

// Router Declaration
const departmentRouter = express.Router();

// Get All Departments
departmentRouter.get('/', checkLogin, getAllDepartments);

// Get Single Department
departmentRouter.get('/:id', checkLogin, getDepartmentById);

// Create a New Department
departmentRouter.post('/', checkLogin, validateDepartment, createDepartment);

// Update Department Details
departmentRouter.put('/:id', checkLogin, validateDepartmentUpdate, updateDepartment);

// Delete a Department
departmentRouter.delete('/:id', checkLogin, deleteDepartment);

// Add Role to Department
departmentRouter.post('/:id/roles', checkLogin, validateRole, addRoleToDepartment);

// Update Role in Department
departmentRouter.put('/:id/roles/:roleId', checkLogin, validateRoleUpdate, updateRoleInDepartment);

// Delete Role from Department
departmentRouter.delete('/:id/roles/:roleId', checkLogin, deleteRoleFromDepartment);

module.exports = departmentRouter;
