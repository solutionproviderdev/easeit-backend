const express = require('express');
const { messaging } = require('../../config/firebaseAdmin');
const {
    sendNotification,
    sendNotificationToMultiple,
} = require('../../controller/notification/notificationController');

const notificationRouter = express.Router();

// Send Push Notification
notificationRouter.post('/send', sendNotification);

notificationRouter.post('/send-to-multiple', sendNotificationToMultiple);

module.exports = notificationRouter;
