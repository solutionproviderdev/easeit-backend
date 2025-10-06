/* eslint-disable operator-linebreak */
/* eslint-disable no-restricted-syntax */
/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable no-await-in-loop */
const Lead = require('../schemas/LeadsSchema');
const {
    notifyUpcomingFollowUpReminder,
} = require('../helpers/notification/lead/upcomingFollowUpTriggers');

/**
 * Checks for sales follow-ups that are coming up within the next 10 minutes and sends notifications
 * Mirrors the structure used in checkUpcomingReminders.js but targets sales executives
 */
const checkUpcomingSalesFollowUps = async (io) => {
    try {
        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

        // Find all leads with sales follow-ups that are pending
        // and will occur within the next 10 minutes
        const leads = await Lead.find({
            salesFollowUp: {
                $elemMatch: {
                    time: { $gt: now, $lte: tenMinutesLater },
                    status: 'Pending',
                    tenMinNotificationSent: { $ne: true },
                },
            },
        });

        if (leads.length === 0) {
            return;
        }

        // Loop through each lead and find upcoming sales follow-ups
        for (const lead of leads) {
            const upcomingFollowUps = lead.salesFollowUp.filter(
                (fu) =>
                    fu.status === 'Pending' &&
                    fu.time > now &&
                    fu.time <= tenMinutesLater &&
                    !fu.tenMinNotificationSent
            );

            // Emit a socket event for each upcoming sales follow-up
            for (const followUp of upcomingFollowUps) {
                const timeRemaining = Math.round((followUp.time - now) / (60 * 1000));

                // Emit the upcoming sales follow-up event
                try {
                    io.emit('upcomingSalesFollowUp', {
                        leadId: lead._id,
                        followUpId: followUp._id,
                        followUp,
                        leadName: lead.name || 'Unknown Lead',
                        timeRemaining, // minutes remaining
                    });
                } catch (socketError) {
                    console.error('Failed to emit upcoming sales follow-up:', socketError.message);
                }

                // Mark this sales follow-up as having received the 10-minute notification
                followUp.tenMinNotificationSent = true;

                // Send upcoming sales follow-up notification to Sales Executive
                const recipientUserId = lead.salesExqName;
                if (recipientUserId) {
                    try {
                        await notifyUpcomingFollowUpReminder(
                            lead._id,
                            recipientUserId,
                            followUp,
                            timeRemaining
                        );
                    } catch (notifyError) {
                        console.error(
                            'Failed to send upcoming sales follow-up notification:',
                            notifyError.message
                        );
                    }
                }
            }

            // Save the updated follow-ups with the notification flag
            if (upcomingFollowUps.length > 0) {
                await lead.save();
            }
        }
    } catch (error) {
        console.error('Error checking upcoming sales follow-ups:', error);
    }
};

module.exports = { checkUpcomingSalesFollowUps };
