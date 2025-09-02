const { body, param, query } = require('express-validator');

const validateEdging = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name should be a string'),

    body('catagory')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .isString()
        .withMessage('Category should be a string')
        .isIn(['PVC', 'Acrylic', 'Aluminium', 'Melamine', 'Wood Veneer', 'ABS', 'Other'])
        .withMessage('Invalid category type'),

    body('thickness')
        .notEmpty()
        .withMessage('Thickness ID is required')
        .isMongoId()
        .withMessage('Invalid thickness ID format'),

    body('image').optional().isString().withMessage('Image URL should be a string'),
];

const edgingSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),

    query('catagory')
        .optional()
        .isIn(['PVC', 'Acrylic', 'Aluminium', 'Melamine', 'Wood Veneer', 'ABS', 'Other'])
        .withMessage('Invalid category type'),

    query('sort').optional().isIn(['name', '-name']).withMessage('Sort must be "name" or "-name"'),

    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),

    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateEdgingId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateEdging,
    edgingSearchValidation,
    validateEdgingId,
};
