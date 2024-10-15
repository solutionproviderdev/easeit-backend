/* eslint-disable no-restricted-syntax */
const express = require('express');

const { default: mongoose } = require('mongoose');
const dayjs = require('dayjs');
const { Parser } = require('json2csv');
const fs = require('fs');
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

// Function to update all leads with status 'unread' to 'New'
const updateUnreadLeadsToNew = async () => {
    try {
        // Use Mongoose updateMany to update all leads where status is 'unread'
        const result = await Lead.updateMany(
            { status: 'unread' }, // Filter: leads with status 'unread'
            { $set: { status: 'New' } } // Update: set status to 'New'
        );

        console.log(`Updated ${result.modifiedCount} leads.`);
    } catch (error) {
        console.error('Error updating leads:', error.message);
    }
};

// Function to generate CSV for all leads
async function generateAllLeadsMessagesCsv() {
    try {
        // Fetch all leads
        const leads = await Lead.find();

        if (!leads || leads.length === 0) {
            console.log('No leads found');
            return;
        }

        const csvData = [];

        // Loop through each lead and process messages
        leads.forEach((lead) => {
            const messagesByUs = lead.messages.filter((msg) => msg.sentByMe);
            const messagesByCustomer = lead.messages.filter((msg) => !msg.sentByMe);

            // Get the max length to pair messages
            const maxLength = Math.max(messagesByUs.length, messagesByCustomer.length);

            for (let i = 0; i < maxLength; i++) {
                csvData.push({
                    leadId: lead._id, // Add lead ID for reference
                    leadName: lead.name, // Add lead name for reference
                    messageByUs: messagesByUs[i] ? messagesByUs[i].content : '',
                    messageByCustomer: messagesByCustomer[i] ? messagesByCustomer[i].content : '',
                });
            }
        });

        // JSON to CSV conversion
        const fields = ['leadId', 'leadName', 'messageByUs', 'messageByCustomer'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(csvData);

        // Write the CSV data to a file
        fs.writeFileSync('all_leads_messages.csv', csv);
        console.log('CSV file for all leads created successfully!');
    } catch (error) {
        console.error('Error generating CSV for all leads:', error);
    }
}

function isAutomatedMessage(message) {
    // Convert the message to lowercase for case-insensitive matching
    const lowerCaseMessage = message.toLowerCase();

    // Define a regex pattern for automated messages based on common phrases
    const automatedPattern =
			/(replied to|automated welcome message|add comment|assigned this|change or remove|visit messaging settings|You are responding|comment to)/;

    // Test if the message matches the automated pattern
    return automatedPattern.test(lowerCaseMessage);
}

// Function to find and log automated messages
async function logAutomatedMessages() {
    try {
        // Find all leads
        const leads = await Lead.find({});

        // Iterate over each lead and its messages
        leads.forEach((lead) => {
            lead.messages.forEach((message) => {
                // Check if the message content is an automated message
                if (isAutomatedMessage(message.content)) {
                    console.log(`Lead ID: ${lead._id}, Message: ${message.content}`);
                }
            });
        });
    } catch (error) {
        console.error('Error reading messages:', error);
    }
}

// Function to update the `isAutomatedMessage` field in the database
async function updateAutomatedMessages() {
    try {
        // Find all leads
        const leads = await Lead.find({});

        // Iterate over each lead and their messages
        for (const lead of leads) {
            let isUpdated = false;

            // Iterate over the messages of the lead
            lead.messages.forEach((message) => {
                // Check if the message content is automated
                const isAutomated = isAutomatedMessage(message.content);

                // Only update if the isAutomatedMessage field is different from the calculated value
                if (message.isAutomatedMessage !== isAutomated) {
                    message.isAutomatedMessage = isAutomated;
                    isUpdated = true; // Mark as updated
                }
            });

            // If any message was updated, save the lead document
            if (isUpdated) {
                await lead.save();
                console.log(`Lead ID: ${lead._id} has been updated.`);
            }
        }

        console.log('Automated message update process completed.');
    } catch (error) {
        console.error('Error updating automated messages:', error);
    }
}

// updateAutomatedMessages();

// Call the function to log automated messages
// logAutomatedMessages();

// Call the function
// generateAllLeadsMessagesCsv();

// Call the function to update the leads
// updateUnreadLeadsToNew();

// Call the function to add reminders
// generateRandomReminder();

module.exports = leadRouter;
