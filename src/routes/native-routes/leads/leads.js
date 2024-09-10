const express = require('express');

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
} = require('../../../validators/leadValidator');
const { checkAuth } = require('../../../middlewares/auth/checkLoginCookie');

const leadRouter = express.Router();

leadRouter.use('/conversation', leadConversationRouter);

// Get all Leads with filter
leadRouter.get('/', getAllLeads);

// Get single Lead Details
leadRouter.get('/:id', getLeadById);

// New Route for creating a lead
leadRouter.post('/', validateLeadCreation, createLead);

// Route for getting comments of a lead
leadRouter.get('/:id/comments', getComments);

// New route for adding a comment
leadRouter.post('/:id/comments', checkAuth, validateComment, addComment);

// New route for adding or updating requirements
leadRouter.put('/:id/requirements', validateRequirements, updateRequirements);

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

module.exports = leadRouter;
