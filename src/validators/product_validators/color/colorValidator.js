const { body, param, query } = require('express-validator');

const validatePrefabricated = [
    body('prefabricated').notEmpty().withMessage('Prefabricated details are required'),
    body('formicaLaminated')
        .isEmpty()
        .withMessage('Cannot include formica laminated details for prefabricated type'),
    body('paint').isEmpty().withMessage('Cannot include paint details for prefabricated type'),
    body('prefabricated.spName').trim().notEmpty().withMessage('SP Name is required'),
    body('prefabricated.brandName').trim().notEmpty().withMessage('Brand Name is required'),
    body('prefabricated.board').isMongoId().withMessage('Valid board ID is required'),
    body('prefabricated.spCode').trim().notEmpty().withMessage('SP Code is required'),
    body('prefabricated.brandCode').trim().notEmpty().withMessage('Brand Code is required'),
    body('prefabricated.image')
        .optional()
        .matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i)
        .withMessage('Invalid image URL format'),
];

const validateFormicaLaminated = [
    body('formicaLaminated').notEmpty().withMessage('Formica laminated details are required'),
    body('prefabricated')
        .isEmpty()
        .withMessage('Cannot include prefabricated details for formica type'),
    body('paint').isEmpty().withMessage('Cannot include paint details for formica type'),
    body('formicaLaminated.brand').isMongoId().withMessage('Valid brand ID is required'),
    body('formicaLaminated.spCode').trim().notEmpty().withMessage('SP Code is required'),
    body('formicaLaminated.brandCode').trim().notEmpty().withMessage('Brand Code is required'),
    body('formicaLaminated.formicaCategory.category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    body('formicaLaminated.formicaCategory.subCategory')
        .trim()
        .notEmpty()
        .withMessage('Sub-category is required'),
    body('formicaLaminated.pricePerSqFt')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('formicaLaminated.image')
        .optional()
        .matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i)
        .withMessage('Invalid image URL format'),
];

const validatePaint = [
    body('paint.spName').trim().notEmpty().withMessage('SP Name is required'),
    body('paint.brandName').trim().notEmpty().withMessage('Brand Name is required'),
    body('paint.brand').isMongoId().withMessage('Valid brand ID is required'),
    body('paint.paintBaseType')
        .trim()
        .notEmpty()
        .withMessage('Paint base type is required')
        .isString()
        .withMessage('Paint base type must be a string'),
    body('paint.applicationArea')
        .isArray()
        .withMessage('Application area must be an array')
        .notEmpty()
        .withMessage('At least one application area is required'),
    body('paint.applicationArea.*')
        .trim()
        .notEmpty()
        .withMessage('Application area value cannot be empty')
        .isString()
        .withMessage('Application area must be a string'),
    body('paint.pricePerSqFt.fresh')
        .isFloat({ min: 0 })
        .withMessage('Fresh paint price must be a positive number'),
    body('paint.pricePerSqFt.rePaint')
        .isFloat({ min: 0 })
        .withMessage('Re-paint price must be a positive number'),
    body('paint.image')
        .optional()
        .matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i)
        .withMessage('Invalid image URL format'),
];

const validateColor = [
    body('type').isMongoId().withMessage('Valid surface finish ID is required'),
    body().custom((value, { req }) => {
        const colorTypes = ['prefabricated', 'formicaLaminated', 'paint'];
        const providedTypes = colorTypes.filter((type) => req.body[type]);

        if (providedTypes.length !== 1) {
            throw new Error('Exactly one color type must be provided');
        }
        return true;
    }),
    body().custom((value, { req }) => {
        if (req.body.prefabricated) return validatePrefabricated;
        if (req.body.formicaLaminated) return validateFormicaLaminated;
        if (req.body.paint) return validatePaint;
        return false;
    }),
];

const colorSearchValidation = [
    query('search').optional().isString().withMessage('Search keyword should be a string'),
    query('type').optional().isMongoId().withMessage('Invalid surface finish ID'),
    query('sort')
        .optional()
        .isIn(['createdAt', '-createdAt', 'spName', '-spName'])
        .withMessage('Invalid sort parameter'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

const validateColorId = [param('id').isMongoId().withMessage('Invalid ID format')];

module.exports = {
    validateColor,
    colorSearchValidation,
    validateColorId,
};
