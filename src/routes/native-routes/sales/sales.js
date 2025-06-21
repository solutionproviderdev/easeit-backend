/* eslint-disable no-restricted-syntax */
const express = require('express');

const { checkAuth } = require('../../../middlewares/auth/checkAuth');
const {
    validateAddFollowUp,
    validateUpdateFollowUp,
} = require('../../../validators/leadSalesValidators');
const {
    addFollowUp,
    updateFollowUp,
    getAllFollowUps,
    completeMeeting,
    updateLeadStatusToSold,
    updateLeadStatusToProspect,
    updateLeadStatusToQuotationSent,
    updateLeadStatusToFinalMeasurement,
} = require('../../../controller/lead/leadSalesController');

const leadSalesRouter = express.Router();

// route to get all leads with follow ups
leadSalesRouter.get('/follow-up', checkAuth, getAllFollowUps);

// route for adding a new follow up to a lead
leadSalesRouter.post('/follow-up/:leadID', checkAuth, validateAddFollowUp, addFollowUp);

// change the status of Follow Up of a lead
leadSalesRouter.put(
    '/follow-up/:leadID/:followUpID',
    checkAuth,
    validateUpdateFollowUp,
    updateFollowUp
);

// complete a meeting of a lead
leadSalesRouter.put('/meeting-complete/:leadID/:meetingId', checkAuth, completeMeeting);

// change the status tof a lead to Sold
leadSalesRouter.put('/sold/:leadID/:meetingId', checkAuth, updateLeadStatusToSold);

leadSalesRouter.put('/prospect/:leadId/:meetingId', checkAuth, updateLeadStatusToProspect);

leadSalesRouter.put(
    '/quotation-sent/:leadId/:meetingId',
    checkAuth,
    updateLeadStatusToQuotationSent
);

leadSalesRouter.put(
    '/final-measurement/:leadId/:meetingId',
    checkAuth,
    updateLeadStatusToFinalMeasurement
);

module.exports = leadSalesRouter;
