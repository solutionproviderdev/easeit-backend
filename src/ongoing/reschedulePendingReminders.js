/* eslint-disable no-restricted-syntax */
const schedule = require('node-schedule');
const Lead = require('../schemas/LeadsSchema');

const reschedulePendingReminders = async (io) => {
    try {
        // Find all leads with pending reminders
        const leads = await Lead.find({
            reminder: {
                $elemMatch: {
                    time: { $gte: new Date() }, // Reminder time is in the future
                    status: 'Pending', // Status is still pending
                },
            },
        });

        // Loop through each lead and reschedule reminders
        for (const lead of leads) {
            lead.reminder.forEach((reminder) => {
                if (reminder.status === 'Pending' && reminder.time > new Date()) {
                    schedule.scheduleJob(reminder.time, async () => {
                        const updatedLead = await Lead.findById(lead._id);
                        if (!updatedLead) return;

                        const reminderToUpdate = updatedLead.reminder.id(reminder._id);
                        if (reminderToUpdate && reminderToUpdate.status === 'Pending') {
                            reminderToUpdate.status = 'Missed';
                            await updatedLead.save();

                            console.log(
                                `Reminder ${reminderToUpdate._id} for lead ${lead._id} marked as Missed.`
                            );

                            // Emit a socket event for the missed reminder
                            if (io) {
                                io.emit('missedReminder', {
                                    leadId: lead._id,
                                    reminderId: reminderToUpdate._id,
                                    reminder: reminderToUpdate.toObject(),
                                });
                            }
                        }
                    });

                    console.log(`Rescheduled reminder ${reminder._id} for lead ${lead._id}.`);
                }
            });
        }

        // console.log('Pending reminders rescheduled successfully.');
    } catch (error) {
        res.json({ error: error.message });
        // console.error('Error rescheduling pending reminders:', error);
    }
};

module.exports = { reschedulePendingReminders };
