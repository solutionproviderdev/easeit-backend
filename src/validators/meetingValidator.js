const { check } = require('express-validator');
const { commonValidations, validateRequest } = require('../utils/validation');

// Meeting Validation Rules
exports.meetingValidationRules = [
    // Validate leadId (must be a valid MongoDB ObjectId)
    check('leadId').custom(() => commonValidations.validateObjectId),

    // Validate date (must be a valid ISO date)
    check('date').custom(() => commonValidations.validateDate),

    // Validate slot (must be one of the allowed slot values)
    check('slot')
        .isIn([
            '10:00 AM',
            '11:00 AM',
            '12:00 PM',
            '01:00 PM',
            '02:00 PM',
            '03:00 PM',
            '04:00 PM',
            '05:00 PM',
            '06:00 PM',
            '07:00 PM',
            '08:00 PM',
            '09:00 PM',
            '10:00 PM',
            '11:00 PM',
            '12:00 AM',
            '01:00 AM',
            '02:00 AM',
            '03:00 AM',
            '04:00 AM',
            '05:00 AM',
            '06:00 AM',
            '07:00 AM',
            '08:00 AM',
            '09:00 AM',
        ])
        .withMessage('Slot must be a valid time slot'),

    // Validate salesExecutive (must be a valid MongoDB ObjectId)
    check('salesExecutive')
        .optional()
        .isMongoId()
        .withMessage('Sales Executive ID must be a valid MongoDB ObjectId'),

    // Validate status (must be one of the allowed statuses)
    check('status')
        .optional()
        .isIn(['Fixed', 'Postponed', 'Rescheduled', 'Canceled'])
        .withMessage(
            'Status must be one of Meeting Fixed, Meeting Postponed, Meeting Rescheduled, or Meeting Canceled'
        ),

    // Validate visitCharge (must be a number and greater than or equal to 0)
    check('visitCharge')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Visit charge must be a number greater than or equal to 0'),

    // Validate commentText (if provided)
    check('commentText').optional().isString().withMessage('Comment must be a string'),

    // Validate images (if provided)
    check('images').custom(() => commonValidations.validateImages),
    validateRequest,
];

// Use centralized validation middleware
exports.validateMeeting = validateRequest;

// Postpone Meeting Validator
exports.postponeMeetingValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),

    // Validate commentText (if provided)
    check('commentText').optional().isString().withMessage('Comment must be a string'),

    // Validate images (if provided)
    check('images').custom(() => commonValidations.validateImages),
    validateRequest,
];

// Reschedule Meeting Validator
exports.rescheduleMeetingValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),
    check('date').isISO8601().withMessage('Date must be a valid ISO8601 date'),
    check('slot')
        .isIn([
            '10:00 AM',
            '11:00 AM',
            '12:00 PM',
            '01:00 PM',
            '02:00 PM',
            '03:00 PM',
            '04:00 PM',
            '05:00 PM',
            '06:00 PM',
            '07:00 PM',
            '08:00 PM',
            '09:00 PM',
            '10:00 PM',
            '11:00 PM',
            '12:00 AM',
            '01:00 AM',
            '02:00 AM',
            '03:00 AM',
            '04:00 AM',
            '05:00 AM',
            '06:00 AM',
            '07:00 AM',
            '08:00 AM',
            '09:00 AM',
        ])
        .withMessage('Slot must be a valid time slot'),

    // Validate commentText (if provided)
    check('commentText').optional().isString().withMessage('Comment must be a string'),

    // Validate images (if provided)
    check('images').custom(() => commonValidations.validateImages),
    validateRequest,
];

// Cancel Meeting Validator
exports.cancelMeetingValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),

    // Validate commentText (if provided)
    check('commentText').optional().isString().withMessage('Comment must be a string'),

    // Validate images (if provided)
    check('images').custom(() => commonValidations.validateImages),
    validateRequest,
];

// validators/meetingValidator.js

exports.getMeetingByIdValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),
];

// validators/meetingValidator.js

exports.updateMeetingDetailsValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),
    // Optionally validate fields as needed, for example:
    check('date').optional().isISO8601().withMessage('Date must be a valid ISO8601 date'),
    check('slot')
        .optional()
        .isIn([
            '10:00 AM',
            '11:00 AM',
            '12:00 PM',
            '01:00 PM',
            '02:00 PM',
            '03:00 PM',
            '04:00 PM',
            '05:00 PM',
            '06:00 PM',
            '07:00 PM',
            '08:00 PM',
            '09:00 PM',
            '10:00 PM',
            '11:00 PM',
            '12:00 AM',
            '01:00 AM',
            '02:00 AM',
            '03:00 AM',
            '04:00 AM',
            '05:00 AM',
            '06:00 AM',
            '07:00 AM',
            '08:00 AM',
            '09:00 AM',
        ])
        .withMessage('Slot must be a valid time slot'),
    check('salesExecutive')
        .optional()
        .isMongoId()
        .withMessage('Sales Executive ID must be a valid MongoDB ObjectId'),
];

// validators/meetingValidator.js

exports.reassignOrSwapMeetingValidationRules = [
    check('id').isMongoId().withMessage('Meeting ID must be a valid MongoDB ObjectId'),
    check('newSalesExecutiveId')
        .isMongoId()
        .withMessage('New Sales Executive ID must be a valid MongoDB ObjectId'),
];
