const { validationResult } = require('express-validator');

// Centralized validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Common validation rules
const commonValidations = {
    // Image validation
    validateImages: {
        optional: true, // 0-9
        isArray: true,
        custom: (images) => {
            if (!Array.isArray(images)) {
                throw new Error('Images must be an array of strings');
            }
            if (!images.every((img) => typeof img === 'string')) {
                throw new Error('Each image must be a string');
            }
            return true;
        },
    },

    // MongoDB ObjectId validation
    validateObjectId: {
        isMongoId: true,
        errorMessage: 'Must be a valid MongoDB ObjectId',
    },

    // Phone number validation
    validatePhone: {
        isString: true,
        matches: /^[0-9]{10,15}$/,
        errorMessage: 'Phone number must be between 10 to 15 digits',
    },

    // Date validation (ISO format)
    validateDate: {
        isISO8601: true,
        errorMessage: 'Must be a valid ISO8601 date',
    },

    // Comment text validation
    validateCommentText: {
        isString: true,
        trim: true,
        notEmpty: true,
        errorMessage: 'Comment text is required and must be a string',
    },
};

module.exports = {
    validateRequest,
    commonValidations,
};
