const { body, param, query } = require('express-validator');

const validateHardwareItem = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('unit')
        .trim()
        .notEmpty()
        .withMessage('Unit is required')
        .isIn(['piece', 'pair', 'set', 'dozen'])
        .withMessage('Invalid unit type'),

    body('useQuantityPerSqFt')
        .isFloat({ min: 0 })
        .withMessage('Usage quantity per square feet must be a positive number'),

    body('useScrew').isBoolean().withMessage('Use screw must be a boolean value'),

    body('screwSize')
        .if(body('useScrew').equals('true'))
        .notEmpty()
        .withMessage('Screw size is required when useScrew is true'),

    body('screwQuantity')
        .if(body('useScrew').equals('true'))
        .isInt({ min: 1 })
        .withMessage('Screw quantity must be a positive integer'),

    body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),

    body('useTypes')
        .isArray()
        .withMessage('Use types must be an array')
        .custom((value) => {
            const validTypes = ['cabinet', 'drawer', 'shelve', 'glass', 'depreciation'];
            return value.every((type) => validTypes.includes(type));
        })
        .withMessage('Invalid use type'),

    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('minStockLevel')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Minimum stock level must be a non-negative integer'),

    body('currentStock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Current stock must be a non-negative integer'),
];

const hardwareItemSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),
    query('useTypes')
        .optional()
        .isString()
        .withMessage('Use types must be a comma-separated string'),
    query('sort')
        .optional()
        .isIn(['name', '-name', 'unitPrice', '-unitPrice', 'currentStock', '-currentStock'])
        .withMessage('Invalid sort parameter'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
];

const validateHardwareItemId = [param('id').isMongoId().withMessage('Invalid hardware item ID')];

module.exports = {
    validateHardwareItem,
    hardwareItemSearchValidation,
    validateHardwareItemId,
};
