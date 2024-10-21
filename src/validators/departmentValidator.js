/* eslint-disable prefer-promise-reject-errors */
// validators/departmentValidator.js
const { body, validationResult } = require('express-validator');
const Department = require('../schemas/auth/DepartmentSchema');

// Validation middleware for creating a new department
const validateDepartment = [
    body('departmentName')
        .notEmpty()
        .withMessage('Department name is required')
        .custom(async (value) => {
            const department = await Department.findOne({ departmentName: value });
            if (department) {
                return Promise.reject('Department name already in use');
            }
        }),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('roles').optional().isArray().withMessage('Roles must be an array'),
    body('roles.*.roleName')
        .optional()
        .notEmpty()
        .withMessage('Role name is required')
        .isString()
        .withMessage('Role name must be a string'),
    body('roles.*.description')
        .optional()
        .isString()
        .withMessage('Role description must be a string'),
    body('roles.*.permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('roles.*.permissions.*.resource')
        .optional()
        .notEmpty()
        .withMessage('Permission resource is required')
        .isString()
        .withMessage('Permission resource must be a string'),
    body('roles.*.permissions.*.actions')
        .optional()
        .isArray()
        .withMessage('Actions must be an array'),
    body('roles.*.permissions.*.actions.*.name')
        .optional()
        .notEmpty()
        .withMessage('Action name is required')
        .isString()
        .withMessage('Action name must be a string'),
    body('roles.*.permissions.*.actions.*.allowed')
        .optional()
        .isBoolean()
        .withMessage('Allowed must be a boolean'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for updating a department
const validateDepartmentUpdate = [
    body('departmentName')
        .optional()
        .notEmpty()
        .withMessage('Department name is required')
        .custom(async (value, { req }) => {
            const department = await Department.findOne({ departmentName: value });
            if (department && department._id.toString() !== req.params.id) {
                return Promise.reject('Department name already in use');
            }
        }),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('roles').optional().isArray().withMessage('Roles must be an array'),
    body('roles.*.roleName')
        .optional()
        .notEmpty()
        .withMessage('Role name is required')
        .isString()
        .withMessage('Role name must be a string'),
    body('roles.*.description')
        .optional()
        .isString()
        .withMessage('Role description must be a string'),
    body('roles.*.permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('roles.*.permissions.*.resource')
        .optional()
        .notEmpty()
        .withMessage('Permission resource is required')
        .isString()
        .withMessage('Permission resource must be a string'),
    body('roles.*.permissions.*.action')
        .optional()
        .notEmpty()
        .withMessage('Permission action is required')
        .isString()
        .withMessage('Permission action must be a string'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validatePermissions = [
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*.resource')
        .notEmpty()
        .withMessage('Permission resource is required')
        .isString()
        .withMessage('Permission resource must be a string'),
    body('permissions.*.actions')
        .isArray({ min: 1 })
        .withMessage('Actions must be an array with at least one action'),
    body('permissions.*.actions.*.name')
        .notEmpty()
        .withMessage('Action name is required')
        .isString()
        .withMessage('Action name must be a string'),
    body('permissions.*.actions.*.allowed')
        .isBoolean()
        .withMessage('isActive must be a boolean value'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Role validation
const validateRole = [
    body('roleName')
        .notEmpty()
        .withMessage('Role name is required')
        .isString()
        .withMessage('Role name must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    validatePermissions, // Include the permission validator here

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateRoleUpdate = [
    body('roleName').optional().isString().withMessage('Role name must be a string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('permissions.*.resource')
        .optional()
        .notEmpty()
        .withMessage('Permission resource is required')
        .isString()
        .withMessage('Permission resource must be a string'),
    body('permissions.*.actions')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Actions must be an array with at least one action'),
    body('permissions.*.actions.*.actionName')
        .optional()
        .notEmpty()
        .withMessage('Action name is required')
        .isString()
        .withMessage('Action name must be a string'),
    body('permissions.*.actions.*.isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = {
    validateDepartment,
    validateDepartmentUpdate,
    validateRole,
    validateRoleUpdate,
    validatePermissions,
};
