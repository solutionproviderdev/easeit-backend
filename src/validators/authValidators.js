/* eslint-disable prefer-promise-reject-errors */
// validators/userValidator.js
const { body, validationResult } = require('express-validator');
const User = require('../schemas/auth/UserSchema');
const Department = require('../schemas/auth/DepartmentSchema');

// Validation rules for creating a user
const validateUser = [
    body('nameAsPerNID').notEmpty().withMessage('Name as per NID is required'),
    body('nickname')
        .notEmpty()
        .withMessage('Nickname is required')
        .custom(async (value) => {
            const user = await User.findOne({ nickname: value });
            if (user) {
                return Promise.reject('Nickname already in use');
            }
        }),
    body('email').isEmail().withMessage('Valid email is required'),
    body('personalPhone').notEmpty().withMessage('Personal phone is required'),
    body('officePhone').notEmpty().withMessage('Office phone is required'),
    body('gender')
        .isIn(['Male', 'Female', 'Other'])
        .withMessage('Gender must be Male, Female, or Other'),
    body('address').notEmpty().withMessage('Address is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('roleId')
        .notEmpty()
        .withMessage('Role ID is required')
        .custom(async (value) => {
            const department = await Department.findOne({ 'roles._id': value });
            if (!department) {
                return Promise.reject('Invalid role ID');
            }
        }),
    body('departmentId')
        .notEmpty()
        .withMessage('Department ID is required')
        .custom(async (value) => {
            const department = await Department.findById(value);
            if (!department) {
                return Promise.reject('Invalid department ID');
            }
        }),
    body('guardian.name').notEmpty().withMessage('Guardian name is required'),
    body('guardian.phone').notEmpty().withMessage('Guardian phone is required'),
    body('guardian.relation').notEmpty().withMessage('Guardian relation is required'),
    body('type').isIn(['Admin', 'Operator']).withMessage('Type must be Admin or Operator'),

    // Validate profilePicture and coverPhoto as valid URLs (allow localhost)
    body('profilePicture')
        .optional()
        .isURL({
            require_protocol: true,
            require_tld: false, // Disable TLD requirement to allow localhost
        })
        .withMessage('Profile picture must be a valid URL'),
    body('coverPhoto')
        .optional()
        .isURL({
            require_protocol: true,
            require_tld: false, // Disable TLD requirement to allow localhost
        })
        .withMessage('Cover photo must be a valid URL'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for URLs
const validateURL = (fieldName) => [
    body(fieldName)
        .notEmpty()
        .withMessage(`${fieldName} is required`)
        .isURL()
        .withMessage(`Invalid ${fieldName} URL`),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for status
const validateStatus = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Active', 'Inactive'])
        .withMessage('Invalid status'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Allowed document types
const allowedDocumentTypes = [
    'resume',
    'nidCopy',
    'academicDocument',
    'bankAccountNumber',
    'agreement',
];

// Validation rules for document
const validateDocument = [
    body('documentType')
        .notEmpty()
        .withMessage('Document type is required')
        .isIn(allowedDocumentTypes)
        .withMessage('Invalid document type'),
    body('documentURL')
        .notEmpty()
        .withMessage('Document URL is required')
        .isURL()
        .withMessage('Invalid document URL'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for password
const validateUserPasswordChange = [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateAdminPasswordChange = [
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for updating a user
const validateUserUpdate = [
    body('nameAsPerNID').optional().notEmpty().withMessage('Name as per NID is required'),
    body('nickname')
        .optional()
        .notEmpty()
        .withMessage('Nickname is required')
        .custom(async (value, { req }) => {
            const user = await User.findOne({ nickname: value });
            if (user && user._id.toString() !== req.params.id) {
                return Promise.reject('Nickname already in use');
            }
        }),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('personalPhone').optional().notEmpty().withMessage('Personal phone is required'),
    body('officePhone').optional().notEmpty().withMessage('Office phone is required'),
    body('gender')
        .optional()
        .isIn(['Male', 'Female', 'Other'])
        .withMessage('Gender must be Male, Female, or Other'),
    body('address').optional().notEmpty().withMessage('Address is required'),
    body('roleId')
        .optional()
        .notEmpty()
        .withMessage('Role ID is required')
        .custom(async (value) => {
            const department = await Department.findOne({ 'roles._id': value });
            if (!department) {
                return Promise.reject('Invalid role ID');
            }
        }),
    body('departmentId')
        .optional()
        .notEmpty()
        .withMessage('Department ID is required')
        .custom(async (value) => {
            const department = await Department.findById(value);
            if (!department) {
                return Promise.reject('Invalid department ID');
            }
        }),
    body('guardian.name').optional().notEmpty().withMessage('Guardian name is required'),
    body('guardian.phone').optional().notEmpty().withMessage('Guardian phone is required'),
    body('guardian.relation').optional().notEmpty().withMessage('Guardian relation is required'),
    body('type').isIn(['Admin', 'Operator']).withMessage('Type must be Admin or Operator'),

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
    validateUser,
    validateURL,
    validateStatus,
    validateDocument,
    validateUserUpdate,
    validateUserPasswordChange,
    validateAdminPasswordChange,
};
