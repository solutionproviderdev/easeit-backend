const express = require('express');
const upload = require('../config/multerconfig');
const {
    addLeads,
    addComment,
    updateLead,
    deleteLead,
    getLeads,
} = require('../controller/leadController');
const { checkLogin } = require('../middlewares/auth/checkLogin');

const leadRouter = express.Router();

leadRouter.get('/', checkLogin, getLeads);

leadRouter.post('/', checkLogin, upload.array('images'), addLeads);

leadRouter.post('/comment/:id', checkLogin, upload.array('images'), addComment);

leadRouter.put('/:id', checkLogin, upload.array('file', 3), updateLead);

leadRouter.delete('/:id', checkLogin, deleteLead);

module.exports = leadRouter;
