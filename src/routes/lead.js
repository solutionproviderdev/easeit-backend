const express = require('express');
const upload = require('../config/multerconfig');
const {
    addLeads,
    addComment,
    updateLead,
    deleteLead,
    updateCreName,
    getLeads,
} = require('../controller/leadController');
const { checkLogin } = require('../middlewares/auth/checkLogin');

const leadRouter = express.Router();

leadRouter.get('/', checkLogin, getLeads);

leadRouter.post('/', checkLogin, upload.array('images'), addLeads);

leadRouter.post('/comment/:id', checkLogin, upload.array('images'), addComment);

leadRouter.put('/:id', checkLogin, upload.array('file', 3), updateLead);

// Route to update creName of a lead
leadRouter.put('/:id/creName', checkLogin, updateCreName);

leadRouter.delete('/:id', checkLogin, deleteLead);

module.exports = leadRouter;
