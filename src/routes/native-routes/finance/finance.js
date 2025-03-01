/* eslint-disable no-restricted-syntax */
const express = require('express');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');
const {
    getFinanceDetails,
    addPayment,
    updatePayment,
    deletePayment,
    updateFinanceDetails,
    getAllLeadsWithFinanceDetails,
} = require('../../../controller/lead/leadFinanceController');
const {
    validateAddPayment,
    validateUpdatePayment,
} = require('../../../validators/leadFinanceValidators');

const leadFinanceRouter = express.Router();

// get all leads with finance details
leadFinanceRouter.get('/', checkAuth, getAllLeadsWithFinanceDetails);

// GET /finance/:leadID - Retrieve finance details for a lead
leadFinanceRouter.get('/:leadID', checkAuth, getFinanceDetails);

// Update finance details (clientsBudget, projectValue, soldAmount)
leadFinanceRouter.put('/:leadID', checkAuth, updateFinanceDetails);

// POST /finance/:leadID/payment - Add a new payment record for a lead
leadFinanceRouter.post('/:leadID/payment', checkAuth, validateAddPayment, addPayment);

// PUT /finance/:leadID/payment/:paymentID - Update an existing payment record
leadFinanceRouter.put(
    '/:leadID/payment/:paymentID',
    checkAuth,
    validateUpdatePayment,
    updatePayment
);

// DELETE /finance/:leadID/payment/:paymentID - Delete a payment record for a lead
leadFinanceRouter.delete('/:leadID/payment/:paymentID', checkAuth, deletePayment);

module.exports = leadFinanceRouter;
