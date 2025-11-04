const swaggerAutogen = require('swagger-autogen')();

const outputFile = '../swagger_output.json'; // This is the generated file
const endpointsFiles = ['../src/**/*.js']; // Path to your route files

// Automatically generate Swagger doc based on routes
swaggerAutogen(outputFile, endpointsFiles)
    .then(() => {
        console.log('Swagger documentation generated!');
    })
    .catch((err) => {
        console.log(err);
    });
