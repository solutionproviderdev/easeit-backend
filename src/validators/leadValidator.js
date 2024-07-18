/* eslint-disable prefer-promise-reject-errors */
const { body, validationResult } = require('express-validator');
const { default: mongoose } = require('mongoose');
const User = require('../schemas/UserSchema');
const Department = require('../schemas/DepartmentSchema');

// Validation rules for creating a lead
const validateLeadCreation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateComment = [
    body('comment').notEmpty().withMessage('Comment is required'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('images.*').optional().isURL().withMessage('Invalid image URL'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateWorkScope = [
    body('scope').notEmpty().withMessage('Work scope is required'),
    body('sku').isMongoId().withMessage('Invalid SKU ID'),
    body('squareFeet').isNumeric().withMessage('Square Feet must be a number'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateLeadUpdate = [
    body('name').optional().notEmpty().withMessage('Name is required'),
    body('address.division').optional().notEmpty().withMessage('Division is required'),
    body('address.district').optional().notEmpty().withMessage('District is required'),
    body('address.area').optional().notEmpty().withMessage('Area is required'),
    body('address.address').optional().notEmpty().withMessage('Address is required'),
    body('phone').optional().isString().withMessage('Invalid phone number'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateCreAssignment = [
    body('creName')
        .notEmpty()
        .withMessage('CRE name is required')
        .custom(async (value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                return Promise.reject('Invalid CRE ID format');
            }

            const user = await User.findById(value).populate('departmentId');
            if (!user) {
                return Promise.reject('CRE not found');
            }
            if (user.type !== 'Operator') {
                return Promise.reject('User is not a valid CRE');
            }

            const department = await Department.findOne({
                _id: user.departmentId,
                departmentName: 'CRE',
            });
            if (!department) {
                return Promise.reject('User is not in the CRE department');
            }

            // eslint-disable-next-line no-shadow
            const role = department.roles.find((role) => role._id.equals(user.roleId));
            if (!role || role.roleName !== 'CRE Head') {
                return Promise.reject('User does not have the role of CRE Head');
            }
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = {
    validateWorkScope,
    validateComment,
    validateLeadUpdate,
    validateLeadCreation,
    validateCreAssignment,
};
