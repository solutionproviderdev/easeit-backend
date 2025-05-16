const express = require('express');

const purchaseRouter = express.Router();
const purchaseController = require('../../controller/inventory/purchase.controller');
const {
    validatePurchase,
    validatePayment,
    validateQueryParams,
    validateObjectId,
    validateStatusUpdate,
    validatePaymentWithIds,
    validateBulkPurchase,
} = require('../../validators/inventory/purchase.validator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');
const { checkAdmin } = require('../../middlewares/auth/checkAdmin');

// Basic CRUD Operations
purchaseRouter.get('/', checkAuth, validateQueryParams, purchaseController.getAllPurchases);
purchaseRouter.get('/:id', checkAuth, validateObjectId, purchaseController.getPurchaseById);
purchaseRouter.post(
    '/',
    checkAuth,
    checkAdmin,
    validatePurchase,
    purchaseController.createPurchase
);
purchaseRouter.put(
    '/:id',
    checkAuth,
    checkAdmin,
    validateObjectId,
    validatePurchase,
    purchaseController.updatePurchase
);
purchaseRouter.delete(
    '/:id',
    checkAuth,
    checkAdmin,
    validateObjectId,
    purchaseController.deletePurchase
);

// Status Management
purchaseRouter.put(
    '/:id/status',
    checkAuth,
    checkAdmin,
    validateStatusUpdate,
    purchaseController.updateStatus
);
purchaseRouter.put(
    '/:id/cancel',
    checkAuth,
    checkAdmin,
    validateObjectId,
    purchaseController.cancelPurchase
);

// Payment Management
purchaseRouter.post(
    '/:id/payments',
    checkAuth,
    checkAdmin,
    validateObjectId,
    validatePayment,
    purchaseController.addPayment
);
purchaseRouter.put(
    '/:id/payments/:paymentId',
    checkAuth,
    checkAdmin,
    validatePaymentWithIds,
    purchaseController.updatePayment
);
purchaseRouter.delete(
    '/:id/payments/:paymentId',
    checkAuth,
    checkAdmin,
    validatePaymentWithIds,
    purchaseController.deletePayment
);
purchaseRouter.get(
    '/:id/payments',
    checkAuth,
    validateObjectId,
    purchaseController.getPaymentHistory
);

// Bulk Purchase
purchaseRouter.post(
    '/bulk',
    checkAuth,
    checkAdmin,
    validateBulkPurchase,
    purchaseController.createBulkPurchase
);

module.exports = purchaseRouter;
