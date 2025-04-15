const { body, param, query } = require('express-validator');

const validateHardware = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name should be a string'),

    body('description').optional().isString().withMessage('Description should be a string'),

    body('image').optional().isString().withMessage('Image URL should be a string'),
];

const hardwareSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),

    query('sort').optional().isIn(['name', '-name']).withMessage('Sort must be "name" or "-name"'),

    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),

    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateHardwareId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateHardware,
    hardwareSearchValidation,
    validateHardwareId,
};
