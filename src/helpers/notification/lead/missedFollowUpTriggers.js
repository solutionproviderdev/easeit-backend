const Lead = require('../../../schemas/LeadsSchema');
const Notification = require('../../../schemas/Notification');
const { sendNotificationToUser } = require('../sendNotification');

// Notify a user when a follow-up reminder is missed
// Mirrors the structure used in leadTriggers.js
const notifyMissedFollowUpReminder = async (leadId, userId, reminder) => {
    try {
        const lead = await Lead.findById(leadId).select('name');
        if (!lead) {
            throw new Error('Lead not found');
        }

        const title = 'Missed Follow-Up Reminder';
        const readableTime = new Date(reminder.time).toLocaleString('en-GB', {
            hour12: true,
        });
        const body = `You missed a follow-up for ${lead.name} scheduled at ${readableTime}.`;
        const metadata = { leadId, reminderId: reminder._id };

        // Save the notification to the database.
        const notificationEntry = new Notification({
            userId,
            title,
            body,
            type: 'push',
            metadata,
        });

        const savedNotification = await notificationEntry.save();

        // Deliver via push and emit socket event
        const response = await sendNotificationToUser(
            userId,
            title,
            body,
            metadata,
            'https://solutionprovider.online/assets/images/logo.png',
            savedNotification
        );
        return response;
    } catch (error) {
        console.error('Error in notifyMissedFollowUpReminder:', error);
        throw error;
    }
};

module.exports = { notifyMissedFollowUpReminder };
