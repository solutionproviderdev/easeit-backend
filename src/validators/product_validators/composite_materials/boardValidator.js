const { body, param, query } = require('express-validator');

const validateBoard = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name should be a string'),

    body('baseMaterial')
        .notEmpty()
        .withMessage('Base material ID is required')
        .isMongoId()
        .withMessage('Invalid base material ID format'),

    body('brand')
        .notEmpty()
        .withMessage('Brand ID is required')
        .isMongoId()
        .withMessage('Invalid brand ID format'),

    body('surfaceFinish')
        .notEmpty()
        .withMessage('Surface finish ID is required')
        .isMongoId()
        .withMessage('Invalid surface finish ID format'),

    body('thickness')
        .notEmpty()
        .withMessage('Thickness ID is required')
        .isMongoId()
        .withMessage('Invalid thickness ID format'),

    body('unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a positive number'),

    body('sqftInSingleUnit')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Square feet value must be a positive number'),

    body('sqftPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Square feet price must be a positive number'),

    body('image')
        .optional()
        .matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)
        .withMessage('Invalid image URL format'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    body('dimension').optional().isObject().withMessage('Dimension must be an object'),

    body('dimension.height')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Height must be a positive number'),

    body('dimension.width')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Width must be a positive number'),

    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
];

const boardSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),
    query('brand').optional().isMongoId().withMessage('Invalid brand ID format'),
    query('surfaceFinish').optional().isMongoId().withMessage('Invalid surface finish ID format'),
    query('baseMaterial').optional().isMongoId().withMessage('Invalid base material ID format'),
    query('thickness').optional().isMongoId().withMessage('Invalid thickness ID format'),
    query('sort')
        .optional()
        .isIn(['name', '-name', 'unitPrice', '-unitPrice', 'createdAt', '-createdAt'])
        .withMessage('Invalid sort parameter'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateBoardId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateBoard,
    boardSearchValidation,
    validateBoardId,
};
