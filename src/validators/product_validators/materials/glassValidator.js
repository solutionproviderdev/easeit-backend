const { body, param, query } = require('express-validator');

const validateGlass = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name should be a string'),

    body('thickness')
        .notEmpty()
        .withMessage('Thickness ID is required')
        .isMongoId()
        .withMessage('Invalid thickness ID format'),

    body('sqftPrice')
        .notEmpty()
        .withMessage('Square feet price is required')
        .isFloat({ min: 0 })
        .withMessage('Square feet price must be a positive number'),

    body('type')
        .notEmpty()
        .withMessage('Type is required')
        .isString()
        .withMessage('Type must be a string'),

    body('color')
        .notEmpty()
        .withMessage('Color is required')
        .isIn(['red', 'clear', 'green', 'blue'])
        .withMessage('Invalid color selection'),
];

const glassSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),
    query('type').optional().isString().withMessage('Type should be a string'),
    query('color').optional().isString().withMessage('Invalid color'),
    query('thickness').optional().isMongoId().withMessage('Invalid thickness ID format'),
    query('sort')
        .optional()
        .isIn(['name', '-name', 'sqftPrice', '-sqftPrice', 'createdAt', '-createdAt'])
        .withMessage('Invalid sort parameter'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateGlassId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateGlass,
    glassSearchValidation,
    validateGlassId,
};
