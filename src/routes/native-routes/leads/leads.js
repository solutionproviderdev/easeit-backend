/* eslint-disable no-restricted-syntax */
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
    addPhoneNumberToLead,
    getAllLeadsWithReminders,
    batchAssignLeadToCRE,
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
const leadSalesRouter = require('../sales/sales');
const leadFinanceRouter = require('../finance/finance');
const { conversationStat } = require('../../../controller/lead/leadConversationController');

const leadRouter = express.Router();

leadRouter.use('/conversation', leadConversationRouter);
leadRouter.use('/sales', leadSalesRouter);
leadRouter.use('/finance', leadFinanceRouter);

// Get all Leads with filter
leadRouter.get('/', 
    /* #swagger.tags = ['Leads'] */
    /* #swagger.summary = 'Get all leads' */
    /* #swagger.security = [{ "bearerAuth": [] }] */
    getAllLeads
);

// Get stat of unread lead and need to call leads
leadRouter.get('/conversationstat', conversationStat);

// get all the leads with reminders
leadRouter.get('/reminders', checkAuth, getAllLeadsWithReminders);

// Get single Lead Details
leadRouter.get('/:id', 
    /* #swagger.tags = ['Leads'] */
    /* #swagger.summary = 'Get lead by ID' */
    /* #swagger.security = [{ "bearerAuth": [] }] */
    getLeadById
);

// New Route for creating a lead
leadRouter.post('/', 
    /* #swagger.tags = ['Leads'] */
    /* #swagger.summary = 'Create a new lead' */
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // checkAuth, validateLeadCreation, createLead
    validateLeadCreation, createLead
);

// Route for getting comments of a lead
leadRouter.get('/:id/comments', getComments);

// New route for adding a comment
leadRouter.post('/:id/comments', checkAuth, validateComment, addComment);

// New route for adding or updating requirements
leadRouter.put('/:id/requirements', validateRequirements, updateRequirements);

// New route to add a phone number to a lead
leadRouter.put('/:id/add-phone-number', validatePhoneNumber, addPhoneNumberToLead);

// New route for updating a lead
leadRouter.put('/:id', checkAuth, validateLeadUpdate, updateLead);

// route for adding a reminder to a lead
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

// batch Assign lead to a CRE
leadRouter.put('/assign-cre/batch', batchAssignLeadToCRE);

module.exports = leadRouter;
