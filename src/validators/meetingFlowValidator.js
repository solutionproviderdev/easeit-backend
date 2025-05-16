const { check, param } = require('express-validator');
const mongoose = require('mongoose');

// Validate MongoDB ObjectId
const validateObjectId = (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid meeting ID');
    }
    return true;
};

// Common validation for meeting ID parameter
const meetingIdValidation = [
    param('meetingId')
        .exists()
        .withMessage('Meeting ID is required')
        .custom(validateObjectId)
        .withMessage('Invalid meeting ID format'),
];

// Confirm meeting validation rules
const confirmMeetingValidationRules = [
    ...meetingIdValidation,
    check('callLog')
        .optional()
        .isObject()
        .withMessage('Call log must be an object')
        .custom((value) => {
            if (value) {
                if (!value.recipientNumber || typeof value.recipientNumber !== 'string') {
                    throw new Error('Valid recipient number is required in call log');
                }
                if (!['Incoming', 'Outgoing'].includes(value.callType)) {
                    throw new Error('Call type must be either Incoming or Outgoing');
                }
                if (!['Missed', 'Received'].includes(value.status)) {
                    throw new Error('Call status must be either Missed or Received');
                }
            }
            return true;
        }),
];

const meetingFixValidator = (req, res, next) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(400).json({ errors: errors.array() });
    // }
    next();
};

// Leave meeting validation rules
const leaveMeetingValidationRules = [
    ...meetingIdValidation,
    check('lan')
        .exists()
        .withMessage('Longitude is required')
        .isString()
        .withMessage('Longitude must be a string'),
    check('lat')
        .exists()
        .withMessage('Latitude is required')
        .isString()
        .withMessage('Latitude must be a string'),
    check('time').optional().isISO8601().withMessage('Time must be a valid ISO date'),
];

// Arrive meeting validation rules
const arriveMeetingValidationRules = [
    ...meetingIdValidation,
    check('lan')
        .exists()
        .withMessage('Longitude is required')
        .isString()
        .withMessage('Longitude must be a string'),
    check('lat')
        .exists()
        .withMessage('Latitude is required')
        .isString()
        .withMessage('Latitude must be a string'),
];

// Start meeting validation rules
const startMeetingValidationRules = [...meetingIdValidation];

// End meeting validation rules
const endMeetingValidationRules = [
    ...meetingIdValidation,
    check('status')
        .optional()
        .isIn(['Complete', 'Sold', 'Follow-Up', 'Final Measurement', 'Handover & Review'])
        .withMessage('Invalid meeting status'),
    check('comment').optional().isString().withMessage('Comment must be a string'),
];

module.exports = {
    confirmMeetingValidationRules,
    leaveMeetingValidationRules,
    arriveMeetingValidationRules,
    startMeetingValidationRules,
    endMeetingValidationRules,
};
