/* eslint-disable no-restricted-syntax */
const express = require('express');

const { checkAuth } = require('../../../middlewares/auth/checkAuth');
const {
    validateAddFollowUp,
    validateUpdateFollowUp,
} = require('../../../validators/leadSalesValidators');
const { addFollowUp, updateFollowUp } = require('../../../controller/lead/leadSalesController');

const leadSalesRouter = express.Router();

// route for adding a new follow up to a lead
leadSalesRouter.post('/follow-up/:leadID', checkAuth, validateAddFollowUp, addFollowUp);

// change the status of Follow Up of a lead
leadSalesRouter.put(
    '/follow-up/:leadID/:followUpID',
    checkAuth,
    validateUpdateFollowUp,
    updateFollowUp
);

module.exports = leadSalesRouter;
