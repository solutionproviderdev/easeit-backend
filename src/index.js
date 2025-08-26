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
const swaggerSpec = require('../swagger_output.json');

// internal imports
const { initializeCronJobs, runStartupTasks } = require('./cron/cronJobs');
const {
	notFoundHandler,
	errorHandler,
} = require('./middlewares/common/errorHandler');
const userRouter = require('./routes/auth/user');
const uploadRouter = require('./routes/upload');
const leadRouter = require('./routes/native-routes/leads/leads');
const mapDataRouter = require('./routes/mapDataRouters');
const meetingsRouter = require('./routes/meetings/meeting.route');
const dashBoardRouter = require('./routes/dashboard/dashboard');
const settingsRouter = require('./routes/settings/settingsRouter');

const notificationRouter = require('./routes/notifications/notifications');
const { setIO } = require('./socket/socketService');
const { swaggerUi } = require('../swagger');
const productRouter = require('./routes/product/product.routes');
const webhookRouter = require('./routes/webhook');
const productAdRouter = require('./routes/ad/productAd');
const vendorRouter = require('./routes/inventory/vendor.routes');
const quotationrouter = require('./routes/quotation.routes');
const discountRouter = require('./routes/discountRoutes/discountRoutes');
const calculatorRouter = require('./routes/calculator/calculator.route');
const ProjectStagerouter = require('./routes/projectStage.routes');
const { timingMiddleware } = require('./config/winston');
const { startBaileys } = require('./services/whatsappClient');
const whatsAppRouter = require('./routes/whatsapp');

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

// Set up logging for other parts of the app
app.use(timingMiddleware); // Add this line to use the middleware

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
				'http://localhost:8081',
				'http://localhost:5173',
				'https://680390003c985823ec14ae5d--melodic-platypus-c4121d.netlify.app',
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
				'http://localhost:5173',
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

// Serve swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// set public folder
app.use(express.static(path.join(__dirname, '../public')));

// home Route
app.get('/', (req, res) => {
	res.send('Hello Solution Provider...!');
});

// io connection start
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for the register-user event to join a room named after the userId
    socket.on('register-user', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    });
});

// Set the io instance in your socket service
setIO(io);

// start baileys
startBaileys();

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

// whatsapp router
app.use('/whatsapp', whatsAppRouter);

// product, vendor, router,discount
app.use('/products', productRouter);
app.use('/vendors', vendorRouter);
app.use('/quotations', quotationrouter);

// cabint calculator
app.use('/calculate-cabinet', calculatorRouter);

app.use('/discounts', discountRouter);

// seetings router
app.use('/settings', settingsRouter);
app.use('/project-stages', ProjectStagerouter);

// Replace them with these two lines:
initializeCronJobs(io);
runStartupTasks(io);

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
