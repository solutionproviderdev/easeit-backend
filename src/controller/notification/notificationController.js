const { messaging } = require('../../config/firebaseAdmin');
const { sendNotificationToUser } = require('../../helpers/sendNotification');

/**
 * API Endpoint: Send Notification to a Single User
 */
exports.sendNotification = async (req, res) => {
    try {
        const { token, title, body, image } = req.body;

        const response = await sendNotificationToUser(token, title, body, image);

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
