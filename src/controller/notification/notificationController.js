const { messaging } = require('../../config/firebaseAdmin');
const { sendNotificationToUser } = require('../../helpers/notification/sendNotification');
const Notification = require('../../schemas/Notification');

/**
 * API Endpoint: Send Notification to a Single User
 */
exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, body, image } = req.body;

        const response = await sendNotificationToUser(userId, title, body, image);

        return res.status(response.success ? 200 : 500).json(response);
    } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send notification.',
            error,
        });
    }
};

exports.sendNotificationToMultiple = async (req, res) => {
    try {
        const { tokens, title, body, image } = req.body;

        if (!tokens || !tokens.length) {
            return res.status(400).json({ success: false, message: 'FCM tokens are required' });
        }

        const message = {
            notification: { title, body, image },
            tokens, // Send to multiple users
            webpush: {
                notification: {
                    icon: image || 'https://your-website.com/default-icon.png',
                    vibrate: [100, 50, 100],
                },
            },
        };

        const response = await messaging.sendMulticast(message);
        console.log('Notifications sent:', response);

        return res.status(200).json({ success: true, message: 'Notifications sent successfully.' });
    } catch (error) {
        console.error('Error sending notifications:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send notifications.',
            error,
        });
    }
};

/**
 * Fetch the latest notifications for a user.
 * GET /notifications/:userId
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        // Retrieve the latest 50 notifications for the user, sorted by createdAt descending
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
};

/**
 * Mark a notification as read.
 * POST /notifications/mark-as-read
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.body;
        if (!notificationId) {
            return res.status(400).json({ success: false, message: 'Notification ID is required' });
        }
        await Notification.findByIdAndUpdate(notificationId, { status: 'read' });
        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ success: false, message: 'Error updating notification' });
    }
};

/**
 * Mark all notifications for a user as read.
 * POST /notifications/mark-all-as-read/:userId
 */
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        // Update all notifications for the user to status "read"
        const result = await Notification.updateMany({ userId }, { status: 'read' });
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            result,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Error marking notifications as read' });
    }
};
