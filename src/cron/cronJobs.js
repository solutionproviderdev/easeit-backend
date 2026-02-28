const cron = require('node-cron');
const { findDuplicateLeads, nameBasedLeadAssign } = require('./leadManagement');
const {
    getConversationsAndUpdateLeadsUpdated,
} = require('../ongoing/getConversationAndUpdateLeadOptimized');
const { assignUnassignedLeads } = require('../ongoing/assignUnassignedLeads');
const { checkAndUpdateMissedReminders } = require('../ongoing/checkAndUpdateMissedReminders');
const findDuplicateMessagesAndDelete = require('../ongoing/findDuplicateMesagesAndDelete');
const checkProductAdForLeadMessages = require('../ongoing/checkProductAdForLeadMessages');
const { reAssignOnNotReplied } = require('../helpers/reAssignOnNotReplied');
const { reAssignOnNotSeen } = require('../helpers/reAssignOnNotSeen');
const { sendAutoMessage } = require('../ongoing/sendAutoMessage');
const { reschedulePendingReminders } = require('../ongoing/reschedulePendingReminders');
const { getPerformanceBasedCRE } = require('../helpers/getPerformanceBasedCRE');
const { checkUpcomingReminders } = require('../ongoing/checkUpcomingReminders');
const { checkUpcomingSalesFollowUps } = require('../ongoing/checkUpcomingSalesFollowUps');
const { detectAndUpdateCollectedNumbers } = require('./detectCollectedNumbers');

// Number detection cron moved to ./detectCollectedNumbers.js

const initializeCronJobs = (io) => {
    // Reduce per-second job to safer periodic intervals
    // Every 5 minutes: heavy dedupe and name-based assignment
    cron.schedule(
        '*/5 * * * *',
        async () => {
            findDuplicateLeads();
            nameBasedLeadAssign();
        },
        { timezone: 'Asia/Dhaka' }
    );

    // Every 2 minutes: conversations sync
    cron.schedule(
        '*/2 * * * *',
        async () => {
            // await getConversationsAndUpdateLeadsUpdated(io);
        },
        { timezone: 'Asia/Dhaka' }
    );

    // Every 10 minutes: assignments, missed reminders, dedupe messages, product-ad linking
    cron.schedule(
        '*/10 * * * *',
        async () => {
            await assignUnassignedLeads(io);
            await checkAndUpdateMissedReminders(io);
            await checkProductAdForLeadMessages();
            await findDuplicateMessagesAndDelete();
        },
        { timezone: 'Asia/Dhaka' }
    );

    // Every 5 minutes: reassign not replied/seen
    cron.schedule(
        '*/5 * * * *',
        async () => {
            try {
                await reAssignOnNotReplied(io);
                await reAssignOnNotSeen(io);
            } catch (error) {
                console.error('Error in reassign cron job:', error);
            }
        },
        { timezone: 'Asia/Dhaka' }
    );

    // Every 2 minutes: upcoming reminders/follow-ups and auto-messages
    cron.schedule(
        '*/2 * * * *',
        async () => {
            try {
                await checkUpcomingReminders(io);
                await checkUpcomingSalesFollowUps(io);
                await sendAutoMessage(io);
            } catch (error) {
                console.error('Error in reminders/follow-ups cron job:', error);
            }
        },
        { timezone: 'Asia/Dhaka' }
    );

    // Every 5 minutes: detect collected numbers, update status, and notify CRE
    cron.schedule(
        '*/5 * * * *',
        async () => {
            await detectAndUpdateCollectedNumbers(io);
        },
        { timezone: 'Asia/Dhaka' }
    );
};

const runStartupTasks = (io) => {
    // Run these tasks once when server starts
    reschedulePendingReminders();
    nameBasedLeadAssign();
    checkProductAdForLeadMessages();
    reAssignOnNotReplied(io);
    reAssignOnNotSeen(io);
    findDuplicateLeads();
    // Run number detection once on startup to catch recent leads
    detectAndUpdateCollectedNumbers(io);
    getPerformanceBasedCRE();
};

module.exports = {
    initializeCronJobs,
    runStartupTasks,
};
