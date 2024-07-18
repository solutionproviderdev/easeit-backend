const express = require('express');

const leadConversationRouter = require('../lead-center/leadConversation');
const {
    getAllLeads,
    getLeadById,
    createLead,
    addComment,
    addWorkScope,
    updateLead,
    assignCreToLead,
} = require('../../../controller/lead/leadController');
const {
    validateLeadCreation,
    validateComment,
    validateWorkScope,
    validateLeadUpdate,
    validateCreAssignment,
} = require('../../../validators/leadValidator');

const leadRouter = express.Router();

leadRouter.use('/conversation', leadConversationRouter);

// Get all Leads with filter
leadRouter.get('/', getAllLeads);

// Get single Lead Details
leadRouter.get('/:id', getLeadById);

// New Route for creating a lead
leadRouter.post('/', validateLeadCreation, createLead);

// New route for adding a comment
leadRouter.post('/:id/comments', validateComment, addComment);

// New route for adding work scope
leadRouter.post('/:id/work-scope', validateWorkScope, addWorkScope);

// New route for updating a lead
leadRouter.put('/:id', validateLeadUpdate, updateLead);

// New route for assigned cre
leadRouter.put('/:id/assign-cre', validateCreAssignment, assignCreToLead);

module.exports = leadRouter;
