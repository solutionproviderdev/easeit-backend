const express = require('express');
const upload = require('../config/multerconfig');
const {
    addLeads,
    addComment,
    updateLeadbyStatus,
    deleteLead,
    updateCreName,
    getLeads,
    getLeadDetails,
    fixMeeting,
    getLeadsName,
} = require('../controller/leadController');
const { checkLogin } = require('../middlewares/auth/checkLogin');

const leadRouter = express.Router();

// Retrieve a list of all leads
leadRouter.get('/', checkLogin, getLeads);

// Retrieve names and IDs of all leads for dropdown or autocomplete options
leadRouter.get('/names', checkLogin, getLeadsName);

// Retrieve details of a specific lead by ID
leadRouter.get('/:id', checkLogin, getLeadDetails);

// Create a new lead with optional image uploads
leadRouter.post('/', checkLogin, upload.array('images'), addLeads);

// Add a comment to a specific lead by ID with optional image uploads
leadRouter.post('/comment/:id', checkLogin, upload.array('images'), addComment);

// Update a lead to fix a meeting
leadRouter.put('/fixMeeting/:id', fixMeeting);

// Update a lead's information by ID with optional file uploads (limited to 3 files)
leadRouter.put('/:id', checkLogin, upload.array('images', 3), updateLeadbyStatus);

// Update the CRE name of a specific lead by ID
leadRouter.put('/:id/creName', checkLogin, updateCreName);

// Delete a specific lead by ID
leadRouter.delete('/:id', checkLogin, deleteLead);

module.exports = leadRouter;
