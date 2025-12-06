const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'EaseIT API',
        description: 'API documentation for EaseIT CRM Backend',
        version: '1.0.0',
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local server',
        },
        {
            url: 'https://crm.solutionprovider.com.bd',
            description: 'Production server',
        },
    ],
    tags: [
        {
            name: 'User',
            description: 'User management and authentication',
        },
        {
            name: 'Leads',
            description: 'Lead management operations',
        },
        {
            name: 'Products',
            description: 'Product inventory and management',
        },
        {
            name: 'Product Materials',
            description: 'Base materials, brands, surfaces, etc.',
        },
        {
            name: 'Composite Materials',
            description: 'Boards, edging, glass, hardware items',
        },
        {
            name: 'Product Colors',
            description: 'Product color management',
        },
        {
            name: 'Product Series',
            description: 'Product series management',
        },
        {
            name: 'Health',
            description: 'System health checks',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'john@example.com' },
                    role: { type: 'string', example: 'admin' },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Something went wrong' },
                },
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};

const outputFile = '../swagger_output.json'; // This is the generated file
const endpointsFiles = ['../src/index.js']; // Path to your route files

// Automatically generate Swagger doc based on routes
swaggerAutogen(outputFile, endpointsFiles, doc)
    .then(() => {
        console.log('Swagger documentation generated!');
    })
    .catch((err) => {
        console.log(err);
    });
