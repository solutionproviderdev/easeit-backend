const Lead = require('../../../schemas/LeadsSchema');
const Notification = require('../../../schemas/Notification');
const { sendNotificationToUser } = require('../sendNotification');

// Function to notify a user about a new lead assignment
const notifyNewLeadAssignment = async (leadId, userId) => {
    try {
        const lead = await Lead.findById(leadId).select('name');
        if (!lead) {
            throw new Error('Lead not found');
        }
        const title = 'New Lead Assigned';
        const body = `You have been assigned a new lead: ${lead.name}`;
        const metadata = { leadId };

        // Save the notification to the database.
        const notificationEntry = new Notification({
            userId,
            title,
            body,
            type: 'push',
            metadata,
        });
        const savedNotification = await notificationEntry.save();

        // Pass savedNotification as the last argument
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
        console.error('Error in notifyNewLeadAssignment:', error);
        throw error;
    }
};

module.exports = { notifyNewLeadAssignment };
