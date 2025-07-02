const moment = require('moment');
const winston = require('winston');
const { parse } = require('json2csv'); // Import json2csv
const fs = require('fs');

// Define the CSV file path
const csvFilePath = 'logs/app.csv';

// Create a custom formatter for CSV
const csvFormat = winston.format.printf(({ timestamp, level, message }) => {
    const { route, method, duration, clientIp } = message;
    // Create the log object with the required fields
    const logData = {
        timestamp,
        level,
        route,
        method,
        duration,
        clientIp,
    };

    // Convert the log data into CSV format (each field as a separate column)
    return parse([logData]);
});

// Check if the CSV file exists, and if not, write the header row
const ensureCsvHeader = () => {
    if (!fs.existsSync(csvFilePath)) {
        const header = [
            { id: 'timestamp', title: 'timestamp' },
            { id: 'level', title: 'level' },
            { id: 'route', title: 'route' },
            { id: 'method', title: 'method' },
            { id: 'duration', title: 'duration' },
            { id: 'clientIp', title: 'clientIp' },
        ];

        const csvHeader = parse(header);

        // Write the header row to the CSV file
        fs.writeFileSync(csvFilePath, `${csvHeader}\n`, 'utf8');
        console.log('CSV header written.');
    }
};

// Create a custom logger with different log levels and transports
const logger = winston.createLogger({
    level: 'info', // Default logging level
    transports: [
        // Console log transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Adds color to logs
                winston.format.simple() // Simple log format
            ),
        }),

        // File log transport for CSV logs (no header will be written)
        new winston.transports.File({
            filename: csvFilePath,
            format: winston.format.combine(
                winston.format.timestamp(), // Add timestamp to each log entry
                csvFormat // Custom CSV format
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

        // Prepare the log data with separate fields
        const logData = {
            timestamp: formattedTime,
            level: 'info',
            route: req.originalUrl,
            method: req.method,
            duration,
            clientIp: req.ip,
        };

        // Log the data (it will automatically be formatted as CSV)
        logger.info(logData); // Log the request time with formatted timestamp
    });

    next(); // Proceed to the next middleware or route handler
};

// Example of how to use the logger
logger.info('Logger is initialized');

// Ensure that the CSV header is written when the app starts
ensureCsvHeader();

module.exports = { logger, timingMiddleware };
