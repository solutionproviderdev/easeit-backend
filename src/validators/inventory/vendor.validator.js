const { body, param, query } = require('express-validator');

const validateVendor = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Vendor name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('address').trim().notEmpty().withMessage('Address is required'),

    // Optional contacts array validation for update
    body('contacts').optional().isArray().withMessage('Contacts must be an array'),

    body('contacts.*.name')
        .if(body('contacts').exists())
        .trim()
        .notEmpty()
        .withMessage('Contact name is required'),

    body('contacts.*.phone')
        .if(body('contacts').exists())
        .trim()
        .notEmpty()
        .withMessage('Contact phone is required')
        .matches(/^[+]?[\d\s-]+$/)
        .withMessage('Invalid phone number format'),

    // Optional materials array validation for update
    body('materials').optional().isArray().withMessage('Materials must be an array'),

    body('materials.*.type')
        .if(body('materials').exists())
        .isIn(['Board', 'Edging', 'Surface', 'Hardware'])
        .withMessage('Invalid material type'),

    body('materials.*.material')
        .if(body('materials').exists())
        .isMongoId()
        .withMessage('Invalid material ID'),

    body('materials.*.price')
        .if(body('materials').exists())
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('materials.*.unit')
        .if(body('materials').exists())
        .trim()
        .notEmpty()
        .withMessage('Unit is required'),

    // Rating and image are already optional
    body('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),

    body('image')
        .optional()
        .matches(/^(https?:\/\/|\/|\w:\\).+\.(jpg|jpeg|png|gif|webp)$/i)
        .withMessage('Invalid image URL or path format'),

    // Mark active as optional too (assuming active is a Boolean)
    body('active').optional().isBoolean().withMessage('Active must be a boolean'),
];

module.exports = {
    validateVendor,
};
