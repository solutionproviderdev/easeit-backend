const Lead = require('../../../schemas/LeadsSchema');
const Notification = require('../../../schemas/Notification');
const { sendNotificationToUser } = require('../sendNotification');

// Notify a sales executive when a meeting is assigned to them
// Follows the structure used in leadTriggers.js and upcoming/missed follow-up triggers
const notifyMeetingAssignment = async (leadId, userId, meeting, details = {}) => {
    try {
        const lead = await Lead.findById(leadId).select('name phone source');
        if (!lead) {
            throw new Error('Lead not found');
        }

        const title = details.title || 'New Meeting Assigned';
        const purpose = details.purpose || 'Client meeting';
        const readableTime = new Date(meeting.date).toLocaleString('en-GB', {
            hour12: true,
        });

        const slotText = meeting.slot ? ` (${meeting.slot})` : '';
        const body = `${title}: ${purpose} for ${lead.name} on ${readableTime}${slotText}.`;

        const metadata = {
            leadId,
            meetingId: meeting._id,
            date: meeting.date,
            slot: meeting.slot,
            attendee: { name: lead.name, phone: lead.phone },
            notes: details.notes || null,
            attachments: details.attachments || [],
        };

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
        console.error('Error in notifyMeetingAssignment:', error);
        throw error;
    }
};

module.exports = { notifyMeetingAssignment };
