const cron = require('node-cron');
const { findDuplicateLeads, nameBasedLeadAssign } = require('../../populateDatabase');
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
const exportConversations = require('../bot/trainingData');
const analyzeLeadConversations = require('../SolutionBot/analyzeLeadConversations');
const rewriteUnadssigneLead = require('../helpers/rewriteUnassign');
const { getSpecificMessageLog } = require('../temp/getSpecificMessageLog');
const { processLeadsForAIResponse } = require('../ongoing/solutionBotCronJob');

const initializeCronJobs = (io) => {
    // Every second cron job
    cron.schedule(
        '*/1 * * * * *',
        async () => {
            const now = new Date();
            if (now.getSeconds() % 20 === 0) {
                findDuplicateLeads();
                nameBasedLeadAssign();
                getConversationsAndUpdateLeadsUpdated(io);
                processLeadsForAIResponse(io);
            }
        },
        {
            timezone: 'Asia/Dhaka',
        }
    );

    // Every 10 minutes cron job
    cron.schedule(
        '*/10 * * * *',
        async () => {
            await assignUnassignedLeads(io);
            await checkAndUpdateMissedReminders(io);
            findDuplicateMessagesAndDelete();
        },
        {
            timezone: 'Asia/Dhaka',
        }
    );

    // Every 1 minute cron job
    cron.schedule(
        '* * * * *',
        async () => {
            try {
                await checkProductAdForLeadMessages();
                await reAssignOnNotReplied(io);
                await reAssignOnNotSeen(io);
                await sendAutoMessage(io);
            } catch (error) {
                res.json({ error: error.message });
                // console.error('Error in reAssignOnNotReplied cron job:', error);
            }
        },
        {
            timezone: 'Asia/Dhaka',
        }
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
    getPerformanceBasedCRE();
    // exportConversations();
    // analyzeLeadConversations();
    // rewriteUnadssigneLead();
    // getSpecificMessageLog(
    //     'hi this is solution provider sir do you have any other query or not tell me !'
    // );
};

module.exports = {
    initializeCronJobs,
    runStartupTasks,
};
