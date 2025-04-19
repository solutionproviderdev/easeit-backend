/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const User = require('../../../schemas/auth/UserSchema');
const { sendNotificationToUser } = require('../sendNotification');
const Notification = require('../../../schemas/Notification');

const notifyDeletedMessagesToAdmin = async (lead) => {
    try {
        const deletedMessageIds = lead.messages
            .filter((message) => message.isDeleted)
            .map((message) => message._id);

        if (deletedMessageIds.length === 0) return;

        // Check if notification already sent for this lead
        const existingNotification = await Notification.findOne({
            'metadata.leadId': lead._id,
            'metadata.type': 'meta_message_deleted',
            createdAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
            },
        });

        if (existingNotification) {
            return {
                success: false,
                message: 'Notification already sent for this lead',
            };
        }

        const adminUsers = await User.find({
            type: 'Admin',
            status: 'Active',
        }).select('_id');

        const title = 'Messages Deleted from Meta';
        const body = `${deletedMessageIds.length} messages were deleted from lead: ${lead.name}`;
        const metadata = {
            leadId: lead._id,
            deletedMessageCount: deletedMessageIds.length,
            messageIds: deletedMessageIds,
            type: 'meta_message_deleted', // Added type for future checks
        };

        // Send notification to each admin
        for (const admin of adminUsers) {
            // Save notification in database
            const notificationEntry = new Notification({
                userId: admin._id,
                title,
                body,
                type: 'push',
                metadata,
            });
            const savedNotification = await notificationEntry.save();

            // Send push notification and socket event
            await sendNotificationToUser(
                admin._id,
                title,
                body,
                metadata,
                'https://cdn-icons-png.flaticon.com/512/5972/5972736.png',
                savedNotification
            );
        }

        return {
            success: true,
            notifiedAdmins: adminUsers.length,
            deletedMessages: deletedMessageIds.length,
        };
    } catch (error) {
        console.error('Error in notifyDeletedMessagesToAdmin:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

module.exports = { notifyDeletedMessagesToAdmin };
