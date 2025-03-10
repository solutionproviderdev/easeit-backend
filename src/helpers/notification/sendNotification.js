/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { getIO } = require('../../socket/socketService');
const { messaging } = require('../../config/firebaseAdmin');
const User = require('../../schemas/auth/UserSchema');

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

const getTockenOfAnUser = async (userId) => {
    try {
        const user = await User.findById(userId).select('deviceTokens');
        return user.deviceTokens;
    } catch (error) {
        console.error('Error getting device tokens:', error);
        throw error;
    }
};

/**
 * Sends a push notification to a user via Firebase Cloud Messaging.
 * It sends the notification to each token individually, then emits a socket event.
 * Metadata is stringified and included in the data payload.
 *
 * @param {string} userId - The recipient's user ID.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {object} [metadata={}] - Additional metadata (will be stringified).
 * @param {string} [image='https://solutionprovider.online/assets/images/logo.png'] - Optional image URL for the notification.
 * @param {object} savedNotification - The saved notification entry to be sent via socket.
 * @returns {Promise<object>} - A response object with success or error details.
 */
const sendNotificationToUser = async (
    userId,
    title,
    body,
    metadata = {},
    image = 'https://solutionprovider.online/assets/images/logo.png',
    savedNotification
) => {
    try {
        // Retrieve the device tokens (an array) for the user.
        const tokens = await getTockenOfAnUser(userId);
        if (!tokens || tokens.length === 0) {
            throw new Error('No FCM tokens available for this user');
        }

        const responses = [];
        // Loop over each token and send notification individually.
        for (const token of tokens) {
            const message = {
                notification: {
                    title,
                    body,
                    image,
                },
                data: {
                    meta: JSON.stringify(metadata),
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

            try {
                const response = await messaging.send(message);
                responses.push({ token, success: true, response });
            } catch (error) {
                const errorCode = error?.errorInfo?.code;
                if (errorsToRemoveToken.includes(errorCode)) {
                    console.log(
                        `Token ${token} is invalid and should be removed. Error: ${errorCode}`
                    );
                    responses.push({
                        token,
                        success: false,
                        error: errorCode,
                        remove: true,
                    });
                    // Optionally: Remove token from DB here.
                } else {
                    console.log(`Error sending to token ${token}: ${errorCode}`);
                    responses.push({
                        token,
                        success: false,
                        error: errorCode,
                        remove: false,
                    });
                }
            }
        }

        // Emit a socket event to notify the user with the saved notification entry as payload
        const io = getIO();
        console.log('user ID', userId.toString());
        io.to(userId.toString()).emit('new-notification', savedNotification);

        return {
            success: true,
            message: 'Notifications processed individually and socket event emitted.',
            responses,
        };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { success: false, message: 'Failed to send notification.', error };
    }
};

module.exports = { sendNotificationToUser };
