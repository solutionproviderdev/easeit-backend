const { check, param } = require('express-validator');
const { validateRequest } = require('../utils/validation');

// Product Section Validation
const validateProductSection = [
    check('sections.*.name').trim().notEmpty().withMessage('Section name is required'),
    check('sections.*.dimensions.height')
        .isFloat({ min: 0 })
        .withMessage('Height must be a positive number'),
    check('sections.*.dimensions.width')
        .isFloat({ min: 0 })
        .withMessage('Width must be a positive number'),
    check('sections.*.dimensions.depth')
        .isFloat({ min: 0 })
        .withMessage('Depth must be a positive number'),
    check('sections.*.sqft')
        .isFloat({ min: 0 })
        .withMessage('Square feet must be a positive number'),
    check('sections.*.type').isArray().withMessage('Type must be an array of strings'),
    check('sections.*.surface').isMongoId().withMessage('Invalid surface ID'),
    check('sections.*.color').isMongoId().withMessage('Invalid color ID'),
    check('sections.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

// Quotation Item Validation
const validateQuotationItem = [
    check('items.*.product').isMongoId().withMessage('Invalid product ID'),
    check('items.*.series').isMongoId().withMessage('Invalid series ID'),
    check('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    check('items.*.totalPrice')
        .isFloat({ min: 0 })
        .withMessage('Total price must be a positive number'),
    ...validateProductSection,
];

// Main Quotation Validation
exports.validateQuotation = [
    check('client').isMongoId().withMessage('Invalid client ID'),
    check('transportation')
        .isFloat({ min: 0 })
        .withMessage('Transportation cost must be a positive number'),
    check('discount')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount must be between 0 and 100'),
    check('finalPrice').isFloat({ min: 0 }).withMessage('Final price must be a positive number'),
    check('notes').optional().trim().isString(),
    ...validateQuotationItem,
    validateRequest,
];
