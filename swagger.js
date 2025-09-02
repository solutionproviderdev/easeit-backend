const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Define the Swagger options
const options = {
    definition: {
        openapi: '3.0.0', // Specify OpenAPI version
        info: {
            title: 'EaseIt API',
            version: '1.0.0',
            description: 'API documentation for my Node.js app',
        },
        servers: [
            {
                url: 'http://localhost:5000', // Adjust based on your server's URL
            },
        ],
    },
    apis: ['./src/routes/*.js', './models/*.js'], // Path to your route files or models where you define your API endpoints
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
