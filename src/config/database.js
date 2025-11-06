/* eslint-disable no-console */
const { default: mongoose } = require('mongoose');

async function connectDatabase() {
    const baseUri = process.env.MONGO_CONNECTION_STRING;
    const dbName = process.env.DB_NAME;

    if (!baseUri) {
        throw new Error('MONGO_CONNECTION_STRING is not set');
    }

    const env = process.env.NODE_ENV || 'development';
    const options = {};
    if (dbName) {
        options.dbName = dbName; // use dbName option to avoid changing authSource in production
    }

    try {
        const maskedUri = baseUri.replace(/:\S+@/, ':***@');
        const targetInfo = dbName ? `${maskedUri} (dbName=${dbName})` : maskedUri;
        console.log(`Connecting to MongoDB (${env}) -> ${targetInfo}`);

        await mongoose.connect(baseUri, options);
        console.log('🍀 Database connection successful');
    } catch (err) {
        console.log(err, 'Database connection Error');
        throw err;
    }
}

module.exports = { connectDatabase };
