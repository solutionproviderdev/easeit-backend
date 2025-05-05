const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
	{
		couponCode: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			uppercase: true,
		},
		description: {
			type: String,
			trim: true,
		},
		images: [
			{
				type: String,
				validate: {
					validator(v) {
						return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
					},
					message: 'Invalid image URL format',
				},
			},
		],
		amount: {
			type: Number,
			min: [0, 'Amount cannot be negative'],
		},
		minAmount: {
			type: Number,
			min: [0, 'Minimum amount cannot be negative'],
		},
		maxAmount: {
			type: Number,
			validate: {
				validator(v) {
					return !this.minAmount || v >= this.minAmount;
				},
				message: 'Maximum amount must be greater than minimum amount',
			},
		},
		approvalRequired: {
			type: Boolean,
			default: false,
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'expired'],
			default: 'active',
		},
	},
	{
		timestamps: true,
	}
);

// Indexes for better query performance
discountSchema.index({ couponCode: 1 });
discountSchema.index({ status: 1 });
discountSchema.index({ validUntil: 1 });

const Discount = mongoose.model('Discount', discountSchema);
module.exports = Discount;

