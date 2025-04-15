const { body, param, query } = require('express-validator');

const validateThickness = [
    body('value')
        .notEmpty()
        .withMessage('Value is required')
        .isNumeric()
        .withMessage('Value must be a number'),

    body('unit')
        .notEmpty()
        .withMessage('Unit is required')
        .isString()
        .withMessage('Unit must be a string')
        .isIn(['mm', 'cm', 'm', 'in', 'ft'])
        .withMessage('Invalid unit type'),
];

const thicknessSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),

    query('sort')
        .optional()
        .isIn(['value', '-value'])
        .withMessage('Sort must be "value" or "-value"'),

    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),

    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateThicknessId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateThickness,
    thicknessSearchValidation,
    validateThicknessId,
};
