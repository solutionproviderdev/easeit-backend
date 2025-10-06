const Lead = require('../../../schemas/LeadsSchema');
const Notification = require('../../../schemas/Notification');
const { sendNotificationToUser } = require('../sendNotification');

// Notify a user when a follow-up reminder is upcoming (within configured window)
// Mirrors the structure used in leadTriggers.js and missedFollowUpTriggers.js
const notifyUpcomingFollowUpReminder = async (leadId, userId, reminder, timeRemaining) => {
    try {
        const lead = await Lead.findById(leadId).select('name');
        if (!lead) {
            throw new Error('Lead not found');
        }

        const title = 'Upcoming Follow-Up Reminder';
        const readableTime = new Date(reminder.time).toLocaleString('en-GB', {
            hour12: true,
        });
        const minutesText = typeof timeRemaining === 'number' ? `${timeRemaining} min` : 'soon';
        const body = `Follow-up for ${lead.name} at ${readableTime} (${minutesText}).`;
        const metadata = { leadId, reminderId: reminder._id, timeRemaining };

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
        console.error('Error in notifyUpcomingFollowUpReminder:', error);
        throw error;
    }
};

module.exports = { notifyUpcomingFollowUpReminder };
