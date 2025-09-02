const { body, param, query } = require('express-validator');

const validateVendor = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Vendor name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('address').trim().notEmpty().withMessage('Address is required'),

    body('contacts').isArray().withMessage('Contacts must be an array'),

    body('contacts.*.name').trim().notEmpty().withMessage('Contact name is required'),

    body('contacts.*.phone')
        .trim()
        .notEmpty()
        .withMessage('Contact phone is required')
        .matches(/^[+]?[\d\s-]+$/)
        .withMessage('Invalid phone number format'),

    body('materials').isArray().withMessage('Materials must be an array'),

    body('materials.*.type')
        .isIn(['Board', 'Edging', 'Surface', 'Hardware'])
        .withMessage('Invalid material type'),

    body('materials.*.material').isMongoId().withMessage('Invalid material ID'),

    body('materials.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),

    body('materials.*.unit').trim().notEmpty().withMessage('Unit is required'),

    body('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),

    body('image')
        .optional()
        .matches(/^(https?:\/\/|\/|\w:\\).+\.(jpg|jpeg|png|gif|webp)$/i)
        .withMessage('Invalid image URL or path format'),
];

module.exports = {
    validateVendor,
};
