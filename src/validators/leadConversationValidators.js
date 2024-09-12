const { body, validationResult } = require('express-validator');

const validateSendMetaMessage = [
    // Validate messageType
    body('messageType')
        .notEmpty()
        .withMessage('Message type is required')
        .isIn(['text', 'image', 'audio', 'video', 'file', 'sticker'])
        .withMessage('Invalid message type'),

    // Validate content based on messageType
    body('content').custom((value, { req }) => {
        if (!value) {
            throw new Error('Content is required');
        }

        // Validate text message
        if (req.body.messageType === 'text') {
            if (!value.text || typeof value.text !== 'string') {
                throw new Error('Text content must be a non-empty string');
            }
        }

        // Validate media message (image, audio, video, file)
        if (['image', 'audio', 'video', 'file'].includes(req.body.messageType)) {
            if (!Array.isArray(value.urls) || value.urls.length === 0) {
                throw new Error('URLs must be an array with at least one URL');
            }
            value.urls.forEach((url) => {
                if (typeof url !== 'string') {
                    throw new Error('Each URL must be a string');
                }
            });
        }

        // Validate sticker message
        if (req.body.messageType === 'sticker') {
            if (!value.sticker_id || typeof value.sticker_id !== 'string') {
                throw new Error('Sticker ID is required and must be a string');
            }
        }

        return true;
    }),

    // Middleware to handle validation result
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = {
    validateSendMetaMessage,
};
