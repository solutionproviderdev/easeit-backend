/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

const Lead = require('../schemas/LeadsSchema');
const {
    notifyMissedFollowUpReminder,
} = require('../helpers/notification/lead/missedFollowUpTriggers');

//  Check and update missed reminders
const checkAndUpdateMissedReminders = async (io) => {
    try {
        const now = new Date();

        // Find all leads with reminders that are still pending and have passed their time
        const leads = await Lead.find({
            reminder: {
                $elemMatch: {
                    time: { $lte: now }, // Reminder time is less than or equal to now
                    status: 'Pending', // Status is still pending
                },
            },
        });

        // Loop through each lead and update the status of missed reminders
        for (const lead of leads) {
            const updatedReminders = lead.reminder.map((reminder) => {
                if (reminder.time <= now && reminder.status === 'Pending') {
                    return { ...reminder.toObject(), status: 'Missed' }; // Update status to Missed
                }
                return reminder;
            });

            // Save the updated reminders
            lead.reminder = updatedReminders;
            await lead.save();

            // Find newly missed reminders
            const missedReminders = updatedReminders.filter(
                (reminder) => reminder.status === 'Missed'
            );

            // console.log(`Missed reminders for lead ${lead._id}:`);

            // Emit a socket event for each new missed reminder
            for (const reminder of missedReminders) {
                io.emit('missedReminder', {
                    leadId: lead._id,
                    reminderId: reminder._id,
                    reminder,
                });

                // Send push notification to the assigned user
                const recipientUserId = lead.salesExqName || lead.creName;
                if (recipientUserId) {
                    try {
                        await notifyMissedFollowUpReminder(lead._id, recipientUserId, reminder);
                    } catch (notifyError) {
                        // eslint-disable-next-line no-console
                        console.error('Failed to send missed follow-up notification:', notifyError);
                    }
                }
            }
        }

        // console.log('Missed reminders updated successfully.');
    } catch (error) {
        console.error('Error updating missed reminders:', error);
    }
};

module.exports = { checkAndUpdateMissedReminders };
