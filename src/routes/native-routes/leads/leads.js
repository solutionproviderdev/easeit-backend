/* eslint-disable no-restricted-syntax */
const express = require('express');

const { default: mongoose } = require('mongoose');
const dayjs = require('dayjs');
const leadConversationRouter = require('../lead-center/leadConversation');
const {
    getAllLeads,
    getLeadById,
    addComment,
    updateLead,
    assignCreToLead,
    createLead,
    getComments,
    updateRequirements,
    addReminder,
    updateReminderStatus,
    addReminderWithComment,
    addCallLog,
    addPhoneNumberToLead,
    getAllLeadsWithReminders,
} = require('../../../controller/lead/leadController');
const {
    validateLeadCreation,
    validateComment,
    validateLeadUpdate,
    validateCreAssignment,
    validateRequirements,
    validateReminder,
    validateReminderStatusUpdate,
    validateReminderWithComment,
    validateCallLog,
    validatePhoneNumber,
} = require('../../../validators/leadValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');
const { checkLogin } = require('../../../middlewares/auth/checkLogin');
const Lead = require('../../../schemas/LeadsSchema');

const leadRouter = express.Router();

leadRouter.use('/conversation', leadConversationRouter);

// Get all Leads with filter
leadRouter.get('/', getAllLeads);

// get all the leads with reminders
leadRouter.get('/reminders', getAllLeadsWithReminders);

// Get single Lead Details
leadRouter.get('/:id', getLeadById);

// New Route for creating a lead
leadRouter.post('/', checkAuth, validateLeadCreation, createLead);

// Route for getting comments of a lead
leadRouter.get('/:id/comments', getComments);

// New route for adding a comment
leadRouter.post('/:id/comments', checkAuth, validateComment, addComment);

// New route for adding or updating requirements
leadRouter.put('/:id/requirements', validateRequirements, updateRequirements);

// New route to add a phone number to a lead
leadRouter.put('/:id/add-phone-number', validatePhoneNumber, addPhoneNumberToLead);

// New route for updating a lead
leadRouter.put('/:id', validateLeadUpdate, updateLead);

// Updated route for adding a reminder to a lead
leadRouter.post('/:id/reminders', validateReminder, addReminder);

// New route for updating a reminder status
leadRouter.put(
    '/:leadId/reminders/:reminderId',
    validateReminderStatusUpdate,
    updateReminderStatus
);

// New route for adding a reminder with a comment to a lead
leadRouter.post(
    '/:id/reminders-with-comment',
    checkAuth,
    validateReminderWithComment,
    addReminderWithComment
);

// New route for adding a call log to a lead
leadRouter.post('/:id/call-logs', validateCallLog, addCallLog);

// New route for assigned cre [Need Update]
leadRouter.put('/:id/assign-cre', validateCreAssignment, assignCreToLead);

// Function to generate random reminders
const generateRandomReminder = async () => {
    try {
        // Fetch all leads from the collection
        const leads = await Lead.find();

        if (!leads.length) {
            console.log('No leads found in the collection');
            return;
        }

        // Iterate over each lead and add a random reminder
        for (const lead of leads) {
            // Generate random reminder data
            const randomReminder = {
                time: generateRandomDate(), // Call the random date function
                status: getRandomStatus(), // Call the random status generator
                commentId: new mongoose.Types.ObjectId(), // Generating a random ObjectId
            };

            // Add the reminder to the lead
            lead.reminder.push(randomReminder);

            // Save the updated lead
            await lead.save();
            console.log(`Reminder added to lead ${lead.name}`);
        }
        console.log('All reminders added successfully!');
    } catch (error) {
        console.error('Error generating random reminders:', error.message);
    }
};

// Function to generate a random status from the enum ['Pending', 'Complete', 'Missed']
const getRandomStatus = () => {
    const statuses = ['Pending', 'Complete', 'Missed'];
    const randomIndex = Math.floor(Math.random() * statuses.length);
    return statuses[randomIndex];
};

// Function to generate a random date within the last 30 days
const generateRandomDate = () => {
    const daysAgo = Math.floor(Math.random() * 30); // Random number of days ago
    return dayjs().subtract(daysAgo, 'day').toDate(); // Use dayjs to subtract days and get a date
};

// Call the function to add reminders
// generateRandomReminder();

module.exports = leadRouter;
