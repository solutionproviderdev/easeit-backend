const { messaging } = require('../../config/firebaseAdmin');

const errorsToRemoveToken = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-recipient',
    'messaging/sender-id-mismatch',
];

const errorsToKeepToken = [
    'messaging/message-rate-exceeded',
    'messaging/server-unavailable',
    'messaging/internal-error',
    'messaging/quota-exceeded',
    'messaging/invalid-argument',
    'messaging/invalid-apns-credentials',
];

/**
 * Sends a push notification to a single user via Firebase Cloud Messaging.
 * @param {string} token - The Firebase Cloud Messaging (FCM) token of the recipient.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body/content of the notification.
 * @param {string} [image] - Optional image URL for the notification.
 * @returns {Promise<object>} - A response object containing success or error details.
 */
const sendNotificationToUser = async (
    token,
    title,
    body,
    image = 'https://solutionprovider.online/assets/images/logo.png'
) => {
    try {
        if (!token) {
            throw new Error('FCM token is required');
        }

        const message = {
            notification: {
                title,
                body,
                image,
            },
            token,
            webpush: {
                notification: {
                    icon: image,
                    vibrate: [100, 50, 100],
                    actions: [{ action: 'open_url', title: 'Open App' }],
                },
            },
        };

        const response = await messaging.send(message);
        console.log('Notification sent successfully:', response);

        return {
            success: true,
            message: 'Notification sent successfully.',
            response,
        };
    } catch (error) {
        const {
            errorInfo: { code, message },
        } = error;
        console.error(message, code);
        return { success: false, message: 'Failed to send notification.', error };
    }
};

module.exports = { sendNotificationToUser };
