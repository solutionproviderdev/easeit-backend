/* eslint-disable prettier/prettier */
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { default: mongoose } = require('mongoose');
const { createServer } = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');

// internal Imports
const { notFoundHandler, errorHandler } = require('./middlewares/common/errorHandler');
const settingsRouter = require('./routes/settings/settingsRouter');
const peopleRouter = require('./routes/people');
const webhookRouter = require('./routes/webhook');
const meterialsRouter = require('./routes/meterials');
const productRouter = require('./routes/products');
const meetingsRouter = require('./routes/meeting');
const getConversationsAndUpdateLeads = require('./ongoing/getConversationsAndUpdateLeads');
const fbMessageRouter = require('./routes/FbMessege');
const messageRouter = require('./routes/Message');
const conversationRouter = require('./routes/conversation');
const mapDataRouter = require('./routes/mapDataRouters');
const fetchAndStoreDarazData = require('./ongoing/fetchAndStoreDarazData');
const teamRouter = require('./routes/team');
const wpMessageRouter = require('./routes/whatsAppMessage');
const userRouter = require('./routes/auth/user');
const uploadRouter = require('./routes/upload');
const departmentRouter = require('./routes/auth/department');
const activityLogRouter = require('./routes/auth/activityLog');
const leadRouter = require('./routes/native-routes/leads/leads');

// Initialize app
const app = express();
const server = createServer(app);
dotenv.config();
const io = new Server(server, {
    cors: {
        origin: '*',
      }
});

// Database connection
mongoose
    .connect(process.env.MONGO_CONNECTION_STRING, {})
    .then(() => console.log('🍀 Database connection successfull'))
    .catch((err) => console.log(err, 'Database connection Error'));

// request process
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://192.168.0.155:3000',
            'http://192.168.0.155:5000',
            'http://103.122.143.63:3000',
            'https://easeit.vercel.app',
            'https://crm.solutionprovider.com.bd'
        ];
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

// home Route
app.get('/', (req, res) => {
    res.send('Hello Solution Provider...!');
});

// io connection start
io.on('connection', (socket) => {
    console.log(`User connected ID: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
    });
});

  // Attach io instance to the req object to access it in routes
app.use((req, res, next) => {
    req.io = io;
    next();
  });

// routing setup

// Auth Routers
app.use('/users', userRouter);
app.use('/activity-logs', activityLogRouter);
app.use('/departments', departmentRouter);

// File upload Routers
app.use('/upload', uploadRouter);

// leads
app.use('/lead', leadRouter);

app.use('/people', peopleRouter);
app.use('/settings', settingsRouter);
app.use('/materials', meterialsRouter);
app.use('/product', productRouter);
app.use('/meetings', meetingsRouter);
app.use('/fbmessage', fbMessageRouter);
app.use('/messages', messageRouter);
app.use('/conversations', conversationRouter);
app.use('/map', mapDataRouter);
app.use('/teams', teamRouter);
app.use('/wamessage', wpMessageRouter);

// Get Lead Repetedly
setInterval(() => {
    // getConversationsAndUpdateLeads(io);
}, 8000);

// const fetchAllMapData = async () => {
//     console.log('Hii...!');
//     await fetchAndStoreDarazData();
// };

// 404 error handling
app.use(notFoundHandler);

// Default error handling
app.use(errorHandler);

// Start the server
server.listen(process.env.PORT, () => {
    const environment = process.env.NODE_ENV || 'development';
    const nodeVersion = process.version;
    const currentTime = new Date().toLocaleString();

    console.log(`🚀 Server started in ${environment} mode 🌟`);
    console.log(`💻 Node version: ${nodeVersion}`);
    console.log(`🕒 Current Time: ${currentTime}`);
    console.log(`🔊 App listening on port ${process.env.PORT} 🎧`);

    // fetchAllMapData();
});
