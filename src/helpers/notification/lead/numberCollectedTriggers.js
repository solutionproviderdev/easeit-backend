const Lead = require('../../../schemas/LeadsSchema');
const Notification = require('../../../schemas/Notification');
const { sendNotificationToUser } = require('../sendNotification');

// Notify a CRE when a contact number is collected for a lead
// Mirrors structure of other lead notification triggers
const notifyNumberCollected = async (leadId, userId, phoneNumber) => {
    try {
        const lead = await Lead.findById(leadId).select('name');
        if (!lead) {
            throw new Error('Lead not found');
        }

        const title = 'Contact Number Collected';
        const body = `Number collected for ${lead.name}: ${phoneNumber}`;
        const metadata = { leadId, phoneNumber };

        // Save the notification to the database
        const notificationEntry = new Notification({
            userId,
            title,
            body,
            type: 'push',
            metadata,
        });
        const savedNotification = await notificationEntry.save();

        // Deliver via push and emit socket event (existing mechanism)
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
        console.error('Error in notifyNumberCollected:', error);
        throw error;
    }
};

module.exports = { notifyNumberCollected };

