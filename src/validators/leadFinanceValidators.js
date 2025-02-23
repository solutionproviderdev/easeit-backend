// leadFinanceValidators.js
const { check, validationResult } = require('express-validator');

/**
 * Middleware to validate the request body for adding a new payment.
 */
exports.validateAddPayment = [
    check('amount')
        .exists()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number'),
    check('paymentMethod')
        .exists()
        .withMessage('Payment method is required')
        .isIn([
            'Cash',
            'Cheque',
            'Bank Transfer',
            'Online Payment',
            'Bkash',
            'Nagad',
            'Rocket',
            'SSL E-Commerce',
        ])
        .withMessage('Invalid payment method'),
    check('paymentDate')
        .exists()
        .withMessage('Payment date is required')
        .isISO8601()
        .withMessage('Payment date must be a valid date'),
    check('paymentStatus')
        .exists()
        .withMessage('Payment status is required')
        .isIn(['Paid', 'Unpaid'])
        .withMessage('Payment status must be either Paid or Unpaid'),
    // paymentNote is optional.
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

/**
 * Middleware to validate the request body for updating an existing payment.
 * All fields are optional, but if provided they must meet the following criteria.
 */
exports.validateUpdatePayment = [
    check('amount').optional().isNumeric().withMessage('Amount must be a number'),
    check('paymentMethod')
        .optional()
        .isIn([
            'Cash',
            'Cheque',
            'Bank Transfer',
            'Online Payment',
            'Bkash',
            'Nagad',
            'Rocket',
            'SSL E-Commerce',
        ])
        .withMessage('Invalid payment method'),
    check('paymentDate').optional().isISO8601().withMessage('Payment date must be a valid date'),
    check('paymentStatus')
        .optional()
        .isIn(['Paid', 'Unpaid'])
        .withMessage('Payment status must be either Paid or Unpaid'),
    // paymentNote is optional.
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
