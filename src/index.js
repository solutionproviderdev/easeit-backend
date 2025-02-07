/* eslint-disable prettier/prettier */
/* eslint-disable no-tabs */

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { default: mongoose } = require('mongoose');
const { createServer } = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const cron = require('node-cron');
const swaggerFile = require('../swagger_output.json');

// internal imports
const {
	notFoundHandler,
	errorHandler,
} = require('./middlewares/common/errorHandler');
const userRouter = require('./routes/auth/user');
const uploadRouter = require('./routes/upload');
const leadRouter = require('./routes/native-routes/leads/leads');
const mapDataRouter = require('./routes/mapDataRouters');
const meetingsRouter = require('./routes/meetings/meeting');
const { getConversationsAndUpdateLeadsUpdated } = require('./ongoing/getConversationAndUpdateLeadOptimized');
const dashBoardRouter = require('./routes/dashboard/dashboard');
const settingsRouter = require('./routes/settings/settingsRouter');
const { getPerformanceBasedCRE } = require('./helpers/getPerformanceBasedCRE');
const {
	updateLeadsWithPhoneNumbersAndStatus,
	updateLeadsStatusToMeetingFixed,
	assignLeadsToCRE,
	deleteLeadsWithInvalidMessageIds,
	assignLeadsToCREInOrder,
	randomlyFixMeetings,
	nameBasedLeadAssign,
	imageLinkChange,
	imageLinkChangeLead,
} = require('../populateDatabase');
const { assignUnassignedLeads } = require('./ongoing/assignUnassignedLeads');
const { checkAndUpdateMissedReminders } = require('./ongoing/checkAndUpdateMissedReminders');
const { reschedulePendingReminders } = require('./ongoing/reschedulePendingReminders');
const webhookRouter = require('./routes/webhook');

// Initialize app
const app = express();
const server = createServer(app);
dotenv.config();
const io = new Server(server, {
	cors: {
		origin: '*',
	},
});

// Database connection
mongoose
	.connect(process.env.MONGO_CONNECTION_STRING, {})
	.then(() => console.log('🍀 Database connection successful'))
	.catch((err) => console.log(err, 'Database connection Error'));

// request process
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
	cors({
		origin: (origin, callback) => {
			const allowedOrigins = [
				'http://localhost:3000',
				'http://localhost:5000',
				'http://localhost:5173',
				'http://192.168.0.155:3000',
				'http://192.168.0.155:5000',
				'http://103.122.143.63:3000',
				'https://easeit.vercel.app',
				'https://crm.solutionprovider.com.bd',
				'http://192.168.218.103:5173',
				'http://192.168.68.123:5173',
				'http://localhost:3000',
				'http://localhost:5000',
				'http://192.168.68.130:3000',
				'http://192.168.68.130:5000',
				'http://192.168.68.130',
			];
			if (!origin || allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		credentials: true,
	})
);

// set up EJS
app.set('view engine', 'ejs');

// swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// set public folder
app.use(express.static(path.join(__dirname, '../public')));

// home Route
app.get('/', (req, res) => {
	res.send('Hello Solution Provider...!');
});

// io connection start
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    });
});

// Attach io instance to the req object to access it in routes
app.use((req, res, next) => {
	req.io = io;
	next();
});

// routing setup
app.use('/users', userRouter);
app.use('/upload', uploadRouter);
app.use('/lead', leadRouter);
app.use('/meeting', meetingsRouter);
app.use('/map', mapDataRouter);
app.use('/dashboard', dashBoardRouter);
app.use('/webhook', webhookRouter);

// seetings router
app.use('/settings', settingsRouter);

// Replace setInterval with node-cron
cron.schedule('*/1 * * * * *', () => { // Runs every second
    const now = new Date();
    if (now.getSeconds() % 8 === 0) { // Check if the current second is a multiple of 8
        getConversationsAndUpdateLeadsUpdated(io);
		nameBasedLeadAssign();
    }
}, {
    timezone: 'Asia/Dhaka' // Set your timezone here
});

// Schedule the task to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
	await assignUnassignedLeads(io);
	await checkAndUpdateMissedReminders(io);
}, {
	timezone: 'Asia/Dhaka' // Set your timezone here
});

assignUnassignedLeads(io);

// reschedule pending reminders
reschedulePendingReminders();
nameBasedLeadAssign();
// imageLinkChange();
// imageLinkChangeLead();
getPerformanceBasedCRE();

// updateLeadsWithPhoneNumbersAndStatus();
// updateLeadsStatusToMeetingFixed();
// assignLeadsToCRE();
// getPerformanceBasedCRE();
// assignLeadsToCREInOrder();
// deleteLeadsWithInvalidMessageIds();
// randomlyFixMeetings();

// 404 error handling
app.use(notFoundHandler);

// Default error handling
app.use(errorHandler);

// Start the server
if (require.main === module) {
	server.listen(process.env.PORT, '0.0.0.0', () => {
		const environment = process.env.NODE_ENV || 'development';
		const nodeVersion = process.version;
		const currentTime = new Date().toLocaleString();

		console.log(`🚀 Server started in ${environment} mode 🌟`);
		console.log(`💻 Node version: ${nodeVersion}`);
		console.log(`🕒 Current Time: ${currentTime}`);
		console.log(`🔊 App listening on port ${process.env.PORT} 🎧`);
	});
}

module.exports = app;
