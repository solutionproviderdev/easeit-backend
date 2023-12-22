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
app.use(
    cors({
        origin: '*', // Replace with the actual origin of your frontend
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true, // Allow credentials (cookies, authorization headers, etc.)
        optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    })
);

// set up EJS
app.set('view engine', 'ejs');

// set public folder
app.use(express.static(path.join(__dirname, '../public')));

// routing setup
app.use('/settings', settingsRouter);
app.use('/lead', leadRouter);
app.use('/people', peopleRouter);

// 404 error handling
app.use(notFoundHandler);

// Default error handling
app.use(errorHandler);

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`App listening to port ${process.env.PORT}`);
});
