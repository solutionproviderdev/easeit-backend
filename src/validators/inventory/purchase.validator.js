const { body, param, query } = require('express-validator');

// Validate purchase item
const validatePurchaseItem = [
    body('items.*.vendorMaterial').isMongoId().withMessage('Invalid vendor material ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.pricePerUnit')
        .isFloat({ min: 0 })
        .withMessage('Price per unit must be a positive number'),
    body('items.*.totalPrice')
        .isFloat({ min: 0 })
        .withMessage('Total price must be a positive number'),
];

// Validate create/update purchase
const validatePurchase = [
    body('vendor').isMongoId().withMessage('Invalid vendor ID'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    ...validatePurchaseItem,
    body('additionalCost').optional().isArray().withMessage('Additional cost must be an array'),
    body('additionalCost.*.name').optional().isString().withMessage('Cost name must be a string'),
    body('additionalCost.*.amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost amount must be a positive number'),
];

// Validate payment addition
const validatePayment = [
    body('amount').isFloat({ min: 0 }).withMessage('Payment amount must be a positive number'),
    body('paymentMethod')
        .isIn(['cash', 'bank_transfer', 'check', 'other'])
        .withMessage('Invalid payment method'),
    body('reference')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Reference cannot exceed 100 characters'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
];

// Validate query parameters
const validateQueryParams = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['draft', 'ordered', 'received', 'cancelled'])
        .withMessage('Invalid status'),
    query('paymentStatus')
        .optional()
        .isIn(['pending', 'partially_paid', 'paid'])
        .withMessage('Invalid payment status'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
];

// Validate MongoDB ObjectId parameter
const validateObjectId = [param('id').isMongoId().withMessage('Invalid ID format')];

// Validate status update
const validateStatusUpdate = [
    param('id').isMongoId().withMessage('Invalid ID format'),
    body('status')
        .isIn(['draft', 'ordered', 'received', 'cancelled'])
        .withMessage('Invalid status'),
];

// Validate payment with IDs
const validatePaymentWithIds = [
    param('id').isMongoId().withMessage('Invalid purchase ID'),
    param('paymentId').isMongoId().withMessage('Invalid payment ID'),
    ...validatePayment,
];

// Validate bulk purchase
const validateBulkPurchase = [
    body('purchases').isArray({ min: 1 }).withMessage('At least one purchase is required'),
    body('purchases.*.vendor').isMongoId().withMessage('Invalid vendor ID'),
    body('purchases.*.items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('purchases.*.items.*.vendorMaterial')
        .isMongoId()
        .withMessage('Invalid vendor material ID'),
    body('purchases.*.items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    body('purchases.*.items.*.pricePerUnit')
        .isFloat({ min: 0 })
        .withMessage('Price per unit must be a positive number'),
    body('purchases.*.items.*.totalPrice')
        .isFloat({ min: 0 })
        .withMessage('Total price must be a positive number'),
    body('additionalCost').optional().isArray().withMessage('Additional cost must be an array'),
    body('additionalCost.*.name').optional().isString().withMessage('Cost name must be a string'),
    body('additionalCost.*.amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost amount must be a positive number'),
];

module.exports = {
    validatePurchase,
    validatePayment,
    validateQueryParams,
    validateObjectId,
    validateStatusUpdate,
    validatePaymentWithIds,
    validateBulkPurchase,
};
