const express = require('express');

const quotationrouter = express.Router();
const quotationController = require('../controller/quotation/quotation.controller');
const { validateQuotation } = require('../validators/quotation.validator');
const { checkAuth } = require('../middlewares/auth/checkAuth');
const { checkAdmin } = require('../middlewares/auth/checkAdmin');

// Basic CRUD routes
quotationrouter.get('/', checkAuth, quotationController.getAllQuotations);
quotationrouter.post('/', checkAuth, validateQuotation, quotationController.createQuotation);
quotationrouter.get('/:id', checkAuth, quotationController.getQuotationById);
quotationrouter.put('/:id', checkAuth, validateQuotation, quotationController.updateQuotation);
quotationrouter.delete('/:id', checkAuth, quotationController.deleteQuotation);

// Advanced query routes
quotationrouter.get('/report/search', checkAuth, quotationController.searchQuotations);
quotationrouter.get('/report/filter', checkAuth, quotationController.filterQuotations);
quotationrouter.get('/report/stats', checkAuth, checkAdmin, quotationController.getQuotationStats);

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
