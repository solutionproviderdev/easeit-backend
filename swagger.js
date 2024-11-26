const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger_output.json';
const endpointsFiles = ['./src/index.js']; // Your main file or route files

swaggerAutogen(outputFile, endpointsFiles);
