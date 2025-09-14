/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

const Lead = require('../schemas/LeadsSchema');
const { getIO } = require('../socket/socketService');

// Log initialization
console.log(`[REMINDER_SYSTEM] ${new Date().toISOString()} - Reminder system initialized with socket service`);

/**
 * Checks for reminders that are coming up within the next 10 minutes and sends notifications
 */
const checkUpcomingReminders = async (io) => {
    try {
        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
        
        // Find all leads with reminders that are still pending and will occur within the next 10 minutes
        
        const leads = await Lead.find({
            reminder: {
                $elemMatch: {
                    time: { $gt: now, $lte: tenMinutesLater }, // Reminder time is between now and 10 minutes from now
                    status: 'Pending', // Status is still pending
                    tenMinNotificationSent: { $ne: true } // Only get reminders that haven't been notified yet
                },
            },
        });
        
        if (leads.length === 0) {
            return;
        }

        // Loop through each lead and find upcoming reminders
        for (const lead of leads) {
            const upcomingReminders = lead.reminder.filter(
                (reminder) => 
                    reminder.status === 'Pending' && 
                    reminder.time > now && 
                    reminder.time <= tenMinutesLater &&
                    !reminder.tenMinNotificationSent
            );

            // Emit a socket event for each upcoming reminder
            for (const reminder of upcomingReminders) {
                const timeRemaining = Math.round((reminder.time - now) / (60 * 1000));
                
                // Emit the upcoming reminder event
                try {
                    const io = getIO();
                    io.emit('upcomingReminder', {
                        leadId: lead._id,
                        reminderId: reminder._id,
                        reminder,
                        leadName: lead.name || 'Unknown Lead',
                        timeRemaining: timeRemaining // minutes remaining
                    });
                } catch (socketError) {
                    console.error('Failed to emit upcoming reminder:', socketError.message);
                }

                // Mark this reminder as having received the 10-minute notification
                reminder.tenMinNotificationSent = true;
            }

            // Save the updated reminders with the notification flag
            if (upcomingReminders.length > 0) {
                await lead.save();
            }
        }


    } catch (error) {
        console.error('Error checking upcoming reminders:', error);
    }
};

module.exports = { checkUpcomingReminders };