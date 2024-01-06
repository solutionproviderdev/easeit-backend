/* eslint-disable prettier/prettier */
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { default: mongoose } = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// internal Imports
const { notFoundHandler, errorHandler } = require('./middlewares/common/errorHandler');
const settingsRouter = require('./routes/settings/settingsRouter');
const leadRouter = require('./routes/lead');
const peopleRouter = require('./routes/people');
const webhookRouter = require('./routes/webhook');
const meterialsRouter = require('./routes/meterials');
const productRouter = require('./routes/products');

// Initilize app
const app = express();
dotenv.config();

// Database connection
mongoose
    .connect(process.env.MONGO_CONNECTION_STRING, {})
    .then(() => console.log('Database connection successfull'))
    .catch((err) => console.log(err, 'Database connection Error'));

console.log(process.env.MONGO_CONNECTION_STRING);

// request process
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['http://localhost:3000', 'https://easeit.vercel.app']; // Replace with your allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// set up EJS
app.set('view engine', 'ejs');

// set public folder
app.use(express.static(path.join(__dirname, '../public')));

// routing setup
app.use('/people', peopleRouter);
app.use('/settings', settingsRouter);
app.use('/lead', leadRouter);
app.use('/webhook', webhookRouter);
app.use('/materials', meterialsRouter);
app.use('/product', productRouter);

// 404 error handling
app.use(notFoundHandler);

// Default error handling
app.use(errorHandler);

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`App listening to port ${process.env.PORT}`);
});
