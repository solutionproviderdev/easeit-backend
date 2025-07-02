// winston.js

const moment = require('moment');
const winston = require('winston');

// Create a custom logger with different log levels and transports
const logger = winston.createLogger({
    level: 'info', // Default logging level
    transports: [
        // Console log transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Adds color to logs
                // winston.format.timestamp(), // Add timestamp to logs
                winston.format.simple() // Simple log format
            ),
        }),

        // File log transport (optional)
        new winston.transports.File({
            filename: 'logs/app.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json() // Store logs in JSON format for easier parsing
            ),
        }),
    ],
});

// Middleware to track request handling time
const timingMiddleware = (req, res, next) => {
    const start = Date.now(); // Record the start time

    // Once the response is sent, calculate the time taken and log it
    res.on('finish', () => {
        const duration = Date.now() - start; // Calculate the duration
        const formattedTime = moment().format('YYYY-MM-DD HH:mm:ss'); // Format the current timestamp
        logger.info(`[${formattedTime}] Request to ${req.originalUrl} took ${duration}ms`); // Log the request time with formatted timestamp
    });

    next(); // Proceed to the next middleware or route handler
};

// Example of how to use the logger
logger.info('Logger is initialized');

module.exports = { logger, timingMiddleware };
