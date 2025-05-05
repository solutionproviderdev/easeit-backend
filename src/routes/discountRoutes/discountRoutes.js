const express = require('express');

const discountRouter = express.Router();
const {
    createDiscount,
    findApplicableDiscounts,
    validateCoupon,
    getActiveDiscounts,
    updateApprovalStatus,
    updateDiscountStatus,
} = require('../../controller/discountController');

// Public routes
discountRouter.get('/active', getActiveDiscounts);
discountRouter.post('/validate', validateCoupon);
discountRouter.get('/applicable', findApplicableDiscounts);

// Admin routes
discountRouter.post('/create', createDiscount);
discountRouter.patch('/approval/:id', updateApprovalStatus);
discountRouter.patch('/status/:id', updateDiscountStatus);

module.exports = discountRouter;
