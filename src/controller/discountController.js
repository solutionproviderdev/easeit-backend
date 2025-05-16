const Discount = require('../schemas/DiscountSchema');

// Create new discount
const createDiscount = async (req, res) => {
    console.log('Creating discount.|||||||||||||||||||||..', req.body);
    try {
        const { couponCode, amount, minAmount, maxAmount, description } = req.body;

        // Create new discount
        const discount = new Discount({
            couponCode: couponCode.toUpperCase(),
            description,
            amount, // Discount amount
            minAmount, // Minimum purchase required
            maxAmount, // Maximum purchase limit
            status: 'active',
        });

        await discount.save();
        res.status(201).json({
            success: true,
            data: discount,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Find applicable discounts for purchase amount
const findApplicableDiscounts = async (req, res) => {
    try {
        const { purchaseAmount } = req.query;

        const discounts = await Discount.find({
            status: 'active',
            minAmount: { $lte: purchaseAmount },
            $or: [{ maxAmount: { $gte: purchaseAmount } }, { maxAmount: null }],
        }).sort({ amount: -1 }); // Highest discount first

        res.status(200).json({
            success: true,
            count: discounts.length,
            data: discounts,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Validate and calculate discount
const validateCoupon = async (req, res) => {
    console.log('discout validate !.|||||||||||||||||||||..', req.body);
    try {
        const { couponCode, purchaseAmount } = req.body;

        const discount = await Discount.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'active',
        });

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code',
            });
        }

        // Check minimum purchase requirement
        if (purchaseAmount < discount.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount required: ₹${discount.minAmount}`,
            });
        }

        // Check maximum purchase limit
        if (discount.maxAmount && purchaseAmount > discount.maxAmount) {
            return res.status(400).json({
                success: false,
                message: `Purchase amount exceeds maximum limit: ₹${discount.maxAmount}`,
            });
        }

        res.status(200).json({
            success: true,
            data: {
                originalAmount: purchaseAmount,
                discountAmount: discount.amount,
                finalAmount: purchaseAmount - discount.amount,
                couponDetails: {
                    code: discount.couponCode,
                    description: discount.description,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all active discounts
const getActiveDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find({ status: 'active' }).sort({ amount: -1 });

        res.status(200).json({
            success: true,
            count: discounts.length,
            data: discounts,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add this new function to your existing controller
const updateApprovalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalRequired } = req.body;

        if (typeof approvalRequired !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'approvalRequired must be a boolean value'
            });
        }

        const discount = await Discount.findByIdAndUpdate(
            id,
            { approvalRequired },
            { new: true }
        );

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Approval requirement ${approvalRequired ? 'enabled' : 'disabled'}`,
            data: discount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add this new function
const updateDiscountStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status value
        const validStatuses = ['active', 'inactive', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active, inactive, or expired'
            });
        }

        const discount = await Discount.findByIdAndUpdate(
            id,
            { 
                status,
                lastModifiedAt: new Date()
            },
            { new: true }
        );

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: 'Discount not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Discount status updated to ${status}`,
            data: discount
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
//get coupon by id
const getCouponById = async (req, res) => {
    // console.log('get coupon by id !.|||||||||||||||||||||..', req.params.id);
    
	try {
		const { id } = req.params;
		const discount = await Discount.findById(id);

		if (!discount) {
			return res.status(404).json({
				success: false,
				message: 'Coupon not found',
			});
		}

		res.status(200).json({
			success: true,
			data: discount,
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};
//delete coupon 
const deleteCoupon = async (req, res) => {
	console.log('get coupon by id get for delete ok !', req.params.id);

	try {
		const { id } = req.params;
		const deleted = await Discount.findByIdAndDelete(id);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: 'Coupon not found',
			});
		}

		res.status(200).json({
			success: true,
			message: 'Coupon deleted successfully',
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

const updateCoupon = async (req, res) => {
	try {
		const { id } = req.params;
		const updateData = req.body;

		// Normalize couponCode if present
		if (updateData.couponCode) {
			updateData.couponCode = updateData.couponCode.toUpperCase();
		}

		// Business rule: amount should not be greater than minAmount
		if (
			updateData.amount !== undefined &&
			updateData.minAmount !== undefined &&
			updateData.amount > updateData.minAmount
		) {
			return res.status(400).json({
				success: false,
				message: '`amount` cannot be greater than `minAmount`',
			});
		}

		// Auto-clear maxAmount if it's 0, null, or empty
		if (
			updateData.maxAmount === 0 ||
			updateData.maxAmount === '' ||
			updateData.maxAmount === null
		) {
			updateData.maxAmount = undefined;
		}

		const updated = await Discount.findByIdAndUpdate(
			id,
			{ ...updateData, lastModifiedAt: new Date() },
			{ new: true, runValidators: true }
		);

		if (!updated) {
			return res.status(404).json({
				success: false,
				message: 'Coupon not found',
			});
		}

		res.status(200).json({
			success: true,
			message: 'Coupon updated successfully',
			data: updated,
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};


module.exports = {
	createDiscount,
	findApplicableDiscounts,
	validateCoupon,
	getActiveDiscounts,
	updateApprovalStatus,
	updateDiscountStatus,
	getCouponById,
	deleteCoupon,
	updateCoupon,
};
