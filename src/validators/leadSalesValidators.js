const { body, param } = require('express-validator');

exports.validateAddFollowUp = [
    param('leadID').isMongoId().withMessage('Invalid leadID'),
    body('time')
        .exists()
        .withMessage('Time is required')
        .isISO8601()
        .withMessage('Time must be a valid ISO8601 date'),
    body('status')
        .optional()
        .isIn(['Pending', 'Complete', 'Missed', 'Late Complete'])
        .withMessage('Invalid status'),
    body('type')
        .exists()
        .withMessage('Type is required')
        .isIn(['Call', 'Meeting'])
        .withMessage('Type must be either Call or Meeting'),
    body('commentId').optional().isMongoId().withMessage('Invalid commentId'),
    body('meetingId').optional().isMongoId().withMessage('Invalid meetingId'),
];

exports.validateUpdateFollowUp = [
    param('leadID').isMongoId().withMessage('Invalid leadID'),
    param('followUpID').isMongoId().withMessage('Invalid followUpID'),
    body('time').optional().isISO8601().withMessage('Time must be a valid ISO8601 date'),
    body('status')
        .optional()
        .isIn(['Pending', 'Complete', 'Missed', 'Late Complete'])
        .withMessage('Invalid status'),
    body('type')
        .optional()
        .isIn(['Call', 'Meeting'])
        .withMessage('Type must be either Call or Meeting'),
    body('commentId').optional().isMongoId().withMessage('Invalid commentId'),
    body('meetingId').optional().isMongoId().withMessage('Invalid meetingId'),
];
