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
        
        console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Starting check for upcoming reminders between ${now.toISOString()} and ${tenMinutesLater.toISOString()}`);

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
        
        console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Found ${leads.length} leads with potential upcoming reminders`);

        // If no upcoming reminders, exit
        if (leads.length === 0) {
            console.log(`[REMINDER_LOG] ${new Date().toISOString()} - No upcoming reminders found, exiting`);
            return;
        }

        // Loop through each lead and find upcoming reminders
        for (const lead of leads) {
            console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Processing lead: ${lead._id} (${lead.name || 'Unknown'})`);
            
            const upcomingReminders = lead.reminder.filter(
                (reminder) => 
                    reminder.status === 'Pending' && 
                    reminder.time > now && 
                    reminder.time <= tenMinutesLater &&
                    !reminder.tenMinNotificationSent
            );
            
            console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Found ${upcomingReminders.length} upcoming reminders for lead ${lead._id}`);

            // Emit a socket event for each upcoming reminder
            for (const reminder of upcomingReminders) {
                const timeRemaining = Math.round((reminder.time - now) / (60 * 1000));
                
                console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Sending notification for reminder ${reminder._id} for lead ${lead._id}`);
                console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Reminder details: time=${reminder.time.toISOString()}, timeRemaining=${timeRemaining} minutes`);
                
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
                    console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Successfully emitted upcomingReminder event`);
                } catch (socketError) {
                    console.error(`[REMINDER_LOG] ${new Date().toISOString()} - Failed to emit socket event:`, socketError.message);
                }

                // Mark this reminder as having received the 10-minute notification
                reminder.tenMinNotificationSent = true;
                console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Marked reminder ${reminder._id} as notified`);
            }

            // Save the updated reminders with the notification flag
            if (upcomingReminders.length > 0) {
                await lead.save();
                console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Saved lead ${lead._id} with updated notification flags`);
            }
        }

        console.log(`[REMINDER_LOG] ${new Date().toISOString()} - Completed check for upcoming reminders: ${leads.length} leads with upcoming reminders processed`);
    } catch (error) {
        console.error(`[REMINDER_LOG] ${new Date().toISOString()} - ERROR checking upcoming reminders:`, error);
        console.error(`[REMINDER_LOG] ${new Date().toISOString()} - Error stack:`, error.stack);
    }
};

module.exports = { checkUpcomingReminders };