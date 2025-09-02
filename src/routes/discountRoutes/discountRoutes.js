const express = require('express');

const discountRouter = express.Router();
const {
    createDiscount,
    findApplicableDiscounts,
    validateCoupon,
    getActiveDiscounts,
    updateApprovalStatus,
    updateDiscountStatus,
    getCouponById,
    deleteCoupon,
    updateCoupon,
} = require('../../controller/discountController');

// Public routes
discountRouter.get('/active', getActiveDiscounts);
discountRouter.post('/validate', validateCoupon);
discountRouter.get('/applicable', findApplicableDiscounts);

discountRouter.get('/coupon/:id', getCouponById);
discountRouter.delete('/coupon/:id', deleteCoupon);
discountRouter.put('/coupon/:id', updateCoupon);

// Admin routes
discountRouter.post('/create', createDiscount);
discountRouter.patch('/approval/:id', updateApprovalStatus);
discountRouter.patch('/status/:id', updateDiscountStatus);

module.exports = discountRouter;
