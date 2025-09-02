const { body, param, query } = require('express-validator');

// Validate purchase item
const validatePurchaseItem = [
    body('items.*.vendorMaterial').isMongoId().withMessage('Invalid vendor material ID'),

    body('items.*.material').isMongoId().withMessage('Invalid material ID'),

    body('items.*.materialType')
        .isIn(['Board', 'Edging', 'Surface', 'Hardware'])
        .withMessage('Invalid material type'),

    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

    body('items.*.unit').trim().notEmpty().withMessage('Unit is required'),

    body('items.*.pricePerUnit')
        .isFloat({ min: 0 })
        .withMessage('Price per unit must be a positive number'),

    body('items.*.totalPrice')
        .isFloat({ min: 0 })
        .withMessage('Total price must be a positive number'),
];

// Validate create/update purchase
const validatePurchase = [
    body('purchaseNumber')
        .trim()
        .notEmpty()
        .withMessage('Purchase number is required')
        .matches(/^PO-\d{4}-\d{3,}$/)
        .withMessage('Invalid purchase number format (e.g., PO-2024-001)'),

    body('vendor').isMongoId().withMessage('Invalid vendor ID'),

    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),

    ...validatePurchaseItem,

    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),

    body('expectedDeliveryDate').optional().isISO8601().withMessage('Invalid delivery date format'),

    body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
];

// Validate payment addition
const validatePayment = [
    body('amount').isFloat({ min: 0 }).withMessage('Payment amount must be a positive number'),

    body('paymentDate').isISO8601().withMessage('Invalid payment date format'),

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

// Validate item reception
const validateItemReception = [
    body('receivedQuantity')
        .isInt({ min: 0 })
        .withMessage('Received quantity must be a non-negative integer'),
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
        .isIn(['draft', 'ordered', 'partially_received', 'completed', 'cancelled'])
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
        .isIn(['draft', 'ordered', 'partially_received', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
];

// Validate item reception with IDs
const validateItemReceptionWithIds = [
    param('id').isMongoId().withMessage('Invalid purchase ID'),
    param('itemId').isMongoId().withMessage('Invalid item ID'),
    ...validateItemReception,
];

// Validate payment with IDs
const validatePaymentWithIds = [
    param('id').isMongoId().withMessage('Invalid purchase ID'),
    param('paymentId').isMongoId().withMessage('Invalid payment ID'),
    ...validatePayment,
];

// Validate attachment
const validateAttachment = [
    param('id').isMongoId().withMessage('Invalid purchase ID'),
    body('name').trim().notEmpty().withMessage('Attachment name is required'),
    body('url').trim().notEmpty().isURL().withMessage('Valid attachment URL is required'),
    body('type').trim().notEmpty().withMessage('Attachment type is required'),
];

// Validate attachment deletion
const validateAttachmentDeletion = [
    param('id').isMongoId().withMessage('Invalid purchase ID'),
    param('attachmentId').isMongoId().withMessage('Invalid attachment ID'),
];

// Validate vendor history
const validateVendorHistory = [
    param('vendorId').isMongoId().withMessage('Invalid vendor ID'),
    ...validateQueryParams,
];

// Validate material history
const validateMaterialHistory = [
    param('materialId').isMongoId().withMessage('Invalid material ID'),
    ...validateQueryParams,
];

module.exports = {
    validatePurchase,
    validatePayment,
    validateItemReception,
    validateQueryParams,
    validateObjectId,
    validateStatusUpdate,
    validateItemReceptionWithIds,
    validatePaymentWithIds,
    validateAttachment,
    validateAttachmentDeletion,
    validateVendorHistory,
    validateMaterialHistory,
};
