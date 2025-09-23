const { body, param, query } = require('express-validator');

const validateConfig = [
    body('board').isMongoId().withMessage('Valid board ID is required'),
    body('edging').isMongoId().withMessage('Valid edging ID is required'),
    body('surface').isMongoId().withMessage('Valid surface ID is required'),
];

const validateSeriesSpecification = [
    body('specifications.*.series').isMongoId().withMessage('Valid series ID is required'),
    body('specifications.*.surface').isMongoId().withMessage('Valid surface ID is required'),
    body('specifications.*.configs.front')
        .optional()
        .custom((value) => {
            if (value && !Object.keys(value).length) {
                throw new Error('Front config cannot be empty if provided');
            }
            return true;
        }),
    body('specifications.*.configs.bodyStructure')
        .optional()
        .custom((value) => {
            if (value && !Object.keys(value).length) {
                throw new Error('Body structure config cannot be empty if provided');
            }
            return true;
        }),
    body('specifications.*.hasFront').isBoolean().withMessage('hasFront must be a boolean'),
    body('specifications.*.hasBodyStructure')
        .isBoolean()
        .withMessage('hasBodyStructure must be a boolean'),
    body('specifications.*.hardware').isMongoId().withMessage('Valid hardware ID is required'),
    body('specifications.*.hasHardware')
        .optional()
        .isBoolean()
        .withMessage('hasHardware must be a boolean'),
    body('specifications.*.durability')
        .isFloat({ min: 0, max: 10 })
        .withMessage('Durability must be between 0 and 10'),
    body('specifications.*.waterResistant')
        .isFloat({ min: 0, max: 10 })
        .withMessage('Water resistance must be between 0 and 10'),
    body('specifications.*.scratchResistant')
        .isFloat({ min: 0, max: 10 })
        .withMessage('Scratch resistance must be between 0 and 10'),
    body('specifications.*.screwHoldingCapacity')
        .isFloat({ min: 0, max: 10 })
        .withMessage('Screw holding capacity must be between 0 and 10'),
    body('specifications.*.warranty')
        .isFloat({ min: 0 })
        .withMessage('Warranty must be a positive number'),
    body('specifications.*.pricePerSqFt')
        .isFloat({ min: 0 })
        .withMessage('Price per square foot must be a positive number'),
    body('specifications.*.images').optional().isArray().withMessage('Images must be an array'),
    body('specifications.*.images.*')
        .optional()
        .isString()
        .withMessage('Each image must be a valid URL'),
];

const validateProduct = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim(),
    body('specifications')
        .isArray()
        .withMessage('Specifications must be an array')
        .notEmpty()
        .withMessage('At least one specification is required'),
    body('thumbnail').optional().isString().withMessage('Thumbnail must be a valid URL'),
    body('productStatus')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Invalid product status'),
    ...validateSeriesSpecification,
];

const productSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),
    query('series').optional().isMongoId().withMessage('Invalid series ID'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Invalid minimum price'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Invalid maximum price'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
    query('sort')
        .optional()
        .isIn(['name', '-name', 'createdAt', '-createdAt', 'pricePerSqFt', '-pricePerSqFt'])
        .withMessage('Invalid sort parameter'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
];

const validateProductId = [param('id').isMongoId().withMessage('Invalid product ID format')];

module.exports = {
    validateProduct,
    productSearchValidation,
    validateProductId,
};
