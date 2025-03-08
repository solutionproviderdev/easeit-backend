const express = require('express');
const { messaging } = require('../../config/firebaseAdmin');
const {
    sendNotification,
    sendNotificationToMultiple,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require('../../controller/notification/notificationController');

const notificationRouter = express.Router();

// Send Push Notification
notificationRouter.post('/send', sendNotification);

notificationRouter.post('/send-to-multiple', sendNotificationToMultiple);

// Route to fetch the latest notifications for a user
notificationRouter.get('/:userId', getUserNotifications);

// Route to mark a notification as read
notificationRouter.post('/mark-as-read', markNotificationAsRead);

// Route to mark all notifications for a user as read
notificationRouter.post('/mark-all-as-read/:userId', markAllNotificationsAsRead);

module.exports = notificationRouter;
