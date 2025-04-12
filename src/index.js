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
const {
	getConversationsAndUpdateLeadsUpdated,
} = require('./ongoing/getConversationAndUpdateLeadOptimized');
const dashBoardRouter = require('./routes/dashboard/dashboard');
const settingsRouter = require('./routes/settings/settingsRouter');
const fetchAndStoreDarazData = require('./ongoing/fetchAndStoreDarazData');
const {
	nameBasedLeadAssign,
	findDuplicateLeads,
} = require('../populateDatabase');
const { assignUnassignedLeads } = require('./ongoing/assignUnassignedLeads');
const {
	checkAndUpdateMissedReminders,
} = require('./ongoing/checkAndUpdateMissedReminders');
const {
	reschedulePendingReminders,
} = require('./ongoing/reschedulePendingReminders');
const webhookRouter = require('./routes/webhook');
const productAdRouter = require('./routes/ad/productAd');
const checkProductAdForLeadMessages = require('./ongoing/checkProductAdForLeadMessages');
const { reAssignOnNotReplied } = require('./helpers/reAssignOnNotReplied');
const { reAssignOnNotSeen } = require('./helpers/reAssignOnNotSeen');
const { sendAutoMessage } = require('./ongoing/sendAutoMessage');
const notificationRouter = require('./routes/notifications/notifications');
const { setIO } = require('./socket/socketService');
const { getPerformanceBasedCRE } = require('./helpers/getPerformanceBasedCRE');
const {
	cronsFollowupsForAllUsers,
} = require('./helpers/notification/sendMobilePushNotification');

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
	.catch(err => console.log(err, 'Database connection Error'));

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
				'http://localhost:8080',
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

// set public folder
app.use(express.static(path.join(__dirname, '../public')));

// home Route
app.get('/', (req, res) => {
	res.send('Hello Solution Provider...!');
});

// io connection start
io.on('connection', socket => {
	//  console.log(`User connected: ${socket.id}`);

	// Listen for the register-user event to join a room named after the userId
	socket.on('register-user', userId => {
		if (userId) {
			socket.join(userId);
			//  console.log(`Socket ${socket.id} joined room ${userId}`);
		}
	});

	socket.on('disconnect', reason => {
		//  console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
	});
});

// Set the io instance in your socket service
setIO(io);

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
app.use('/meta-ads', productAdRouter);
app.use('/notifications', notificationRouter);

// seetings router
app.use('/settings', settingsRouter);

// Replace setInterval with node-cron
cron.schedule(
	'*/1 * * * * *',
	async () => {
		// Runs every second
		const now = new Date();
		if (now.getSeconds() % 20 === 0) {
			// Check if the current second is a multiple of 20
			getConversationsAndUpdateLeadsUpdated(io);
			nameBasedLeadAssign();
			findDuplicateLeads();
		}
	},
	{
		timezone: 'Asia/Dhaka', // Set your timezone here
	}
);

// Schedule the task to run every 10 minutes
cron.schedule(
	'*/10 * * * *',
	async () => {
		await assignUnassignedLeads(io);
		await checkAndUpdateMissedReminders(io);
	},
	{
		timezone: 'Asia/Dhaka', // Set your timezone here
	}
);

checkAndUpdateMissedReminders(io);

// Schedule the task to run every 1 minutes
cron.schedule(
	'* * * * *',
	async () => {
		try {
			await checkProductAdForLeadMessages();
			await reAssignOnNotReplied(io);
			await reAssignOnNotSeen(io);
			await sendAutoMessage(io);
			console.log('Re-Assign executed successfully.');
		} catch (error) {
			console.error('Error in reAssignOnNotReplied cron job:', error);
		}
	},
	{
		timezone: 'Asia/Dhaka', // Adjust timezone as needed
	}
);

// assignUnassignedLeads(io);

// some corn jobs eatch time server starts
reschedulePendingReminders();
nameBasedLeadAssign();
checkProductAdForLeadMessages();
reAssignOnNotReplied(io);
reAssignOnNotSeen(io);
findDuplicateLeads();

// auto-send followup notification after processs !
cronsFollowupsForAllUsers();

getPerformanceBasedCRE();

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

module.exports = { app, io };
