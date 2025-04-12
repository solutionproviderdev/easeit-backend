const express = require('express');
const { messaging } = require('../../config/firebaseAdmin');
const {
    sendNotification,
    sendNotificationToMultiple,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../../controller/notification/notificationController');
const { checkAuth } = require('../../middlewares/auth/checkAuth');
const { cronsFollowupsForAllUsers } = require('../../helpers/notification/sendMobilePushNotification');
 
const notificationRouter = express.Router();

// Send Push Notification
notificationRouter.post('/send', checkAuth, sendNotification);

 // notificationRouter.post('/send-mobile', checkAuth,cronsFollowupsForAllUsers);

// Manually trigger background push (wrapped properly ✅)
// notificationRouter.post('/send-mobile', async (req, res) => {
// 	try {
// 		await cronsFollowupsForAllUsers();
// 		res.status(200).json({ message: 'Followup notification process started manually!' });
// 	} catch (error) {
// 		console.error('❌ Error manually starting followup process:', error.message);
// 		res.status(500).json({ error: 'Failed to start followup process' });
// 	}
// });

notificationRouter.post('/send-to-multiple', checkAuth, sendNotificationToMultiple);

// Route to fetch the latest notifications for a user
notificationRouter.get('/:userId', checkAuth, getUserNotifications);

// Route to mark a notification as read
notificationRouter.post('/mark-as-read', checkAuth, markNotificationAsRead);

// Route to mark all notifications for a user as read
notificationRouter.post('/mark-all-as-read/:userId', checkAuth, markAllNotificationsAsRead);

module.exports = notificationRouter;


