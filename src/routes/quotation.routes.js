const express = require('express');

const quotationrouter = express.Router();
const quotationController = require('../controller/quotation/quotation.controller');
const { validateQuotation, validateQuotationStatus } = require('../validators/quotation.validator');
const { checkAuth } = require('../middlewares/auth/checkAuth');
const { checkAdmin } = require('../middlewares/auth/checkAdmin');

// Basic CRUD routes
quotationrouter.get('/', checkAuth, quotationController.getAllQuotations);
quotationrouter.post('/', checkAuth, validateQuotation, quotationController.createQuotation);
quotationrouter.get('/:id', checkAuth, quotationController.getQuotationById);
quotationrouter.put('/:id', checkAuth, validateQuotation, quotationController.updateQuotation);
quotationrouter.delete('/:id', checkAuth, quotationController.deleteQuotation);

// Advanced query routes
quotationrouter.get('/search', checkAuth, quotationController.searchQuotations);
quotationrouter.get('/filter', checkAuth, quotationController.filterQuotations);
quotationrouter.get('/stats', checkAuth, checkAdmin, quotationController.getQuotationStats);

// Status management routes
quotationrouter.patch(
    '/:id/status',
    checkAuth,
    validateQuotationStatus,
    quotationController.updateStatus
);
quotationrouter.post('/:id/approve', checkAuth, quotationController.approveQuotation);
quotationrouter.post('/:id/reject', checkAuth, quotationController.rejectQuotation);
quotationrouter.post(
    '/:id/revise',
    checkAuth,
    validateQuotation,
    quotationController.reviseQuotation
);

// Document generation routes
quotationrouter.get('/:id/pdf', checkAuth, quotationController.generatePDF);
quotationrouter.get('/:id/export', checkAuth, quotationController.exportQuotation);

// Client-specific routes
quotationrouter.get('/client/:clientId', checkAuth, quotationController.getClientQuotations);
quotationrouter.get('/client/:clientId/summary', checkAuth, quotationController.getClientSummary);

// Analytics routes
quotationrouter.get(
    '/analytics/monthly',
    checkAuth,
    checkAdmin,
    quotationController.getMonthlyAnalytics
);
quotationrouter.get(
    '/analytics/conversion-rate',
    checkAuth,
    checkAdmin,
    quotationController.getConversionRate
);

module.exports = quotationrouter;
