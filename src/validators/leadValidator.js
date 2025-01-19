/* eslint-disable prefer-promise-reject-errors */
const { body, validationResult } = require('express-validator');
const { default: mongoose } = require('mongoose');
const User = require('../schemas/auth/UserSchema');
const Department = require('../schemas/auth/DepartmentSchema');

// Validation rules for creating a lead
const validateLeadCreation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone')
        .notEmpty()
        .withMessage('Phone number is required')
        .isString()
        .withMessage('Phone number should be a string')
        .matches(/^[0-9]{10,15}$/) // Regex for basic phone number validation
        .withMessage('Phone number must be between 10 to 15 digits'),
    body('source')
        .optional()
        .isIn(['Facebook', 'WhatsApp', 'Web', 'Phone'])
        .withMessage('Source must be one of the following: Facebook, WhatsApp, Web, Phone'),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for adding a comment
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

// Validation rules for adding or updating requirements
const validateRequirements = [
    body('requirements')
        .isArray()
        .withMessage('Requirements must be an array of strings')
        .custom((requirements) => requirements.every((req) => typeof req === 'string'))
        .withMessage('Each requirement must be a string'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validator for phone number input
const validatePhoneNumber = [
    body('phoneNumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .isString()
        .withMessage('Phone number must be a string')
        .isLength({ min: 8, max: 15 })
        .withMessage('Phone number must be between 8 and 15 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for updating a lead
const validateLeadUpdate = [
    body('name').optional().notEmpty().withMessage('Name is required'),
    body('status')
        .optional()
        .isIn([
            'New',
            'No Response',
            'Message Rescheduled',
            'Need Support',
            'Number Collected',
            'Call Reschedule',
            'Follow Up',
            'Ongoing',
            'Meeting Fixed',
            'Meeting Reschedule',
            'Cancel Meeting',
        ])
        .withMessage('Invalid status value'),
    body('address.division').optional().notEmpty().withMessage('Division is required'),
    body('address.district').optional().notEmpty().withMessage('District is required'),
    body('address.area').optional().notEmpty().withMessage('Area is required'),
    body('address.address').optional().notEmpty().withMessage('Address is required'),
    body('phone').optional().isArray().withMessage('Phone numbers must be an array'),
    body('phone.*').optional().isString().withMessage('Each phone number must be a string'),
    body('source')
        .optional()
        .isIn(['Facebook', 'WhatsApp', 'Web', 'Phone'])
        .withMessage('Invalid source'),
    body('projectStatus.status')
        .optional()
        .isIn(['Ongoing', 'Ready', 'Renovation'])
        .withMessage('Invalid project status'),
    body('projectStatus.subStatus')
        .optional()
        .isIn([
            // Sub-status for 'Ongoing'
            'Roof Casting',
            'Brick Wall',
            'Plaster',
            'Pudding',
            'Two Coat Paint',
            // Sub-status for 'Ready'
            'Tiles Complete',
            'Final Paint Done',
            'Handed Over',
            'Staying in the Apartment',
            // Sub-status for 'Renovation'
            'Interior Work Complete',
        ])
        .withMessage('Invalid project sub-status'),
    body('projectLocation')
        .optional()
        .isIn(['Inside', 'Outside'])
        .withMessage('Invalid project location'),
    body('messagesSeen').optional().isBoolean().withMessage('Messages Seen must be a boolean'),
    body('requirements')
        .optional()
        .isArray()
        .withMessage('Requirements must be an array of strings'),
    body('requirements.*').optional().isString().withMessage('Each requirement must be a string'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Updated validation rules for adding a reminder
const validateReminder = [
    body('time')
        .notEmpty()
        .withMessage('Time is required')
        .isISO8601()
        .withMessage('Invalid date format'),
    body('commentId').optional().isMongoId().withMessage('Invalid comment ID'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for updating a reminder status
const validateReminderStatusUpdate = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Pending', 'Complete', 'Missed', 'Late Complete'])
        .withMessage('Invalid status'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Validation rules for adding a reminder with a comment
const validateReminderWithComment = [
    body('time')
        .notEmpty()
        .withMessage('Time is required')
        .isISO8601()
        .withMessage('Invalid date format'),
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

// Validation rules for adding a call log
const validateCallLog = [
    body('recipientNumber')
        .notEmpty()
        .withMessage('Recipient number is required')
        .isString()
        .withMessage('Recipient number must be a string'),
    body('callType')
        .notEmpty()
        .withMessage('Call type is required')
        .isIn(['Incoming', 'Outgoing'])
        .withMessage('Call type must be either "Incoming" or "Outgoing"'),
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Missed', 'Received'])
        .withMessage('Status must be either "Missed" or "Received"'),
    // body('callDuration').optional().isNumeric().withMessage('Call duration must be a number'),
    body('timestamp')
        .notEmpty()
        .withMessage('Timestamp is required')
        .isISO8601()
        .withMessage('Invalid timestamp format'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

const validateCreAssignment = [
    body('newCREId')
        .notEmpty()
        .withMessage('CRE ID is required')
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
                departmentName: 'CRE',
            });
            console.log('department id', department._id);
            console.log('user department id', user.departmentId._id);
            console.log(
                'department._id.equals(user.departmentId._id)',
                department._id.equals(user.departmentId._id)
            );

            if (!department._id.equals(user.departmentId._id)) {
                return Promise.reject('User is not in the CRE department');
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
    validateComment,
    validateCallLog,
    validateReminder,
    validateLeadUpdate,
    validatePhoneNumber,
    validateLeadCreation,
    validateRequirements,
    validateCreAssignment,
    validateReminderWithComment,
    validateReminderStatusUpdate,
};
