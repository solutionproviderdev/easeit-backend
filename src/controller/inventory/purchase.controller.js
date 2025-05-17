const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Purchase = require('../../schemas/inventory/purchase.model');
const Vendor = require('../../schemas/inventory/vendor.model');

// Helper function to check validation results
const checkValidation = req => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new Error('Validation failed');
		error.statusCode = 422;
		error.data = errors.array();
		throw error;
	}
};

// Helper: generate unique purchase numbers
const generatePurchaseNumber = async (index = 0) => {
	const currentYear = new Date().getFullYear();
	const latest = await Purchase.findOne(
		{ purchaseNumber: new RegExp(`^PO-${currentYear}-`) },
		{},
		{ sort: { purchaseNumber: -1 } }
	);

	let next = 1 + index;
	if (latest) {
		const curr = parseInt(latest.purchaseNumber.split('-')[2], 10);
		next = curr + 1 + index;
	}

	return `PO-${currentYear}-${String(next).padStart(3, '0')}`;
};

// Helper: process items and update material prices
const processPurchaseItems = async (items, vendorId) => {
	const vendor = await Vendor.findById(vendorId);
	if (!vendor) throw new Error('Vendor not found');

	return Promise.all(
		items.map(async item => {
			const vm = vendor.materials.id(item.vendorMaterial);
			if (!vm)
				throw new Error(`Vendor material not found: ${item.vendorMaterial}`);

			const Model = mongoose.model(vm.type);
			await Model.findByIdAndUpdate(vm.material, {
				unitPrice: item.pricePerUnit,
			});

			return {
				vendorMaterial: item.vendorMaterial,
				material: vm.material,
				materialType: vm.type,
				quantity: item.quantity,
				pricePerUnit: item.pricePerUnit,
				totalPrice: item.quantity * item.pricePerUnit,
			};
		})
	);
};

// ————————————————
// Bulk purchase (active)
// ————————————————
exports.createBulkPurchase = async (req, res, next) => {
	try {
		checkValidation(req);
		const { purchases, additionalCost } = req.body;

		const created = await Promise.all(
			purchases.map(async (p, idx) => {
				const purchaseNumber = await generatePurchaseNumber(idx);
				const items = await processPurchaseItems(p.items, p.vendor);

				const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
				const addTotal = additionalCost
					? additionalCost.reduce((sum, c) => sum + (c.amount || 0), 0)
					: 0;

				const doc = new Purchase({
					...p,
					purchaseNumber,
					items,
					additionalCost,
					totalAmount: itemsTotal + addTotal,
				});
				return doc.save();
			})
		);

		res.status(201).json(created);
	} catch (err) {
		next(err);
	}
};

// ————————————————
// Standard CRUD & extras
// ————————————————
exports.getAllPurchases = async (req, res, next) => {
	try {
		const {
			page = 1,
			limit = 10,
			status,
			vendor,
			startDate,
			endDate,
		} = req.query;
		const query = {};
		if (status) query.status = status;
		if (vendor) query.vendor = vendor;
		if (startDate || endDate) {
			query.createdAt = {};
			if (startDate) query.createdAt.$gte = new Date(startDate);
			if (endDate) query.createdAt.$lte = new Date(endDate);
		}

		const [purchases, total] = await Promise.all([
			Purchase.find(query)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(parseInt(limit, 10)),
			Purchase.countDocuments(query),
		]);

		res.status(200).json({
			purchases,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page, 10),
			total,
		});
	} catch (err) {
		next(err);
	}
};

exports.getPurchaseById = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.createPurchase = async (req, res, next) => {
	try {
		checkValidation(req);
		const purchaseNumber = await generatePurchaseNumber();
		const items = await processPurchaseItems(req.body.items, req.body.vendor);

		const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
		const addTotal = req.body.additionalCost
			? req.body.additionalCost.reduce((sum, c) => sum + (c.amount || 0), 0)
			: 0;

		const doc = new Purchase({
			...req.body,
			purchaseNumber,
			items,
			totalAmount: itemsTotal + addTotal,
		});

		const result = await doc.save();
		res.status(201).json(result);
	} catch (err) {
		next(err);
	}
};

exports.updatePurchase = async (req, res, next) => {
	try {
		checkValidation(req);
		if (req.body.items) {
			const items = await processPurchaseItems(req.body.items, req.body.vendor);
			const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
			const addTotal = req.body.additionalCost
				? req.body.additionalCost.reduce((sum, c) => sum + (c.amount || 0), 0)
				: 0;
			req.body.items = items;
			req.body.totalAmount = itemsTotal + addTotal;
		}

		const updated = await Purchase.findByIdAndUpdate(
			req.params.id,
			{ $set: req.body },
			{ new: true, runValidators: true }
		);

		if (!updated) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		res.status(200).json(updated);
	} catch (err) {
		next(err);
	}
};

exports.deletePurchase = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		if (p.status !== 'draft') {
			const e = new Error('Only draft purchases can be deleted');
			e.statusCode = 400;
			throw e;
		}
		await p.remove();
		res.status(200).json({ message: 'Deleted successfully' });
	} catch (err) {
		next(err);
	}
};

exports.updateStatus = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findByIdAndUpdate(
			req.params.id,
			{ status: req.body.status },
			{ new: true }
		);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.receiveItem = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}

		const item = p.items.id(req.params.itemId);
		if (!item) {
			const e = new Error('Item not found');
			e.statusCode = 404;
			throw e;
		}

		if (req.body.receivedQuantity > item.quantity) {
			const e = new Error('Received qty exceeds ordered qty');
			e.statusCode = 400;
			throw e;
		}

		item.receivedQuantity = req.body.receivedQuantity;
		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.cancelPurchase = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findByIdAndUpdate(
			req.params.id,
			{ status: 'cancelled' },
			{ new: true }
		);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.addPayment = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) throw new Error('Purchase not found');

		const paidSoFar = p.paymentDetails.reduce(
			(sum, pay) => sum + pay.amount,
			0
		);
		if (paidSoFar + req.body.amount > p.totalAmount) {
			const e = new Error('Payments exceed total amount');
			e.statusCode = 400;
			throw e;
		}

		p.paymentDetails.push(req.body);
		const newTotal = paidSoFar + req.body.amount;
		p.paymentStatus = newTotal >= p.totalAmount ? 'paid' : 'partially_paid';

		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.updatePayment = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) throw new Error('Purchase not found');

		const idx = p.paymentDetails.findIndex(
			pay => pay._id.toString() === req.params.paymentId
		);
		if (idx === -1) {
			const e = new Error('Payment not found');
			e.statusCode = 404;
			throw e;
		}

		p.paymentDetails[idx] = {
			...p.paymentDetails[idx].toObject(),
			...req.body,
		};

		const totalPaid = p.paymentDetails.reduce(
			(sum, pay) => sum + pay.amount,
			0
		);
		p.paymentStatus = totalPaid >= p.totalAmount ? 'paid' : 'partially_paid';

		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.deletePayment = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) throw new Error('Purchase not found');

		p.paymentDetails = p.paymentDetails.filter(
			pay => pay._id.toString() !== req.params.paymentId
		);

		const totalPaid = p.paymentDetails.reduce(
			(sum, pay) => sum + pay.amount,
			0
		);
		p.paymentStatus = totalPaid === 0 ? 'pending' : 'partially_paid';

		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.getPaymentHistory = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) {
			const e = new Error('Purchase not found');
			e.statusCode = 404;
			throw e;
		}
		res.status(200).json(p.paymentDetails);
	} catch (err) {
		next(err);
	}
};

exports.addAttachment = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) throw new Error('Purchase not found');

		p.attachments.push({
			name: req.body.name,
			url: req.body.url,
			type: req.body.type,
		});

		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.removeAttachment = async (req, res, next) => {
	try {
		checkValidation(req);
		const p = await Purchase.findById(req.params.id);
		if (!p) throw new Error('Purchase not found');

		p.attachments = p.attachments.filter(
			att => att._id.toString() !== req.params.attachmentId
		);

		await p.save();
		res.status(200).json(p);
	} catch (err) {
		next(err);
	}
};

exports.getPurchaseStatistics = async (req, res, next) => {
	try {
		checkValidation(req);
		const stats = await Purchase.aggregate([
			{
				$facet: {
					statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
					totalAmount: [
						{ $group: { _id: null, total: { $sum: '$totalAmount' } } },
					],
					monthlyPurchases: [
						{
							$group: {
								_id: {
									year: { $year: '$createdAt' },
									month: { $month: '$createdAt' },
								},
								count: { $sum: 1 },
								total: { $sum: '$totalAmount' },
							},
						},
					],
				},
			},
		]);
		res.status(200).json(stats[0]);
	} catch (err) {
		next(err);
	}
};

exports.getVendorPurchaseHistory = async (req, res, next) => {
	try {
		checkValidation(req);
		const { page = 1, limit = 10 } = req.query;
		const [purchases, total] = await Promise.all([
			Purchase.find({ vendor: req.params.vendorId })
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(parseInt(limit, 10)),
			Purchase.countDocuments({ vendor: req.params.vendorId }),
		]);

		res.status(200).json({
			purchases,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page, 10),
			total,
		});
	} catch (err) {
		next(err);
	}
};

exports.getMaterialPurchaseHistory = async (req, res, next) => {
	try {
		checkValidation(req);
		const { page = 1, limit = 10 } = req.query;
		const [purchases, total] = await Promise.all([
			Purchase.find({ 'items.material': req.params.materialId })
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(parseInt(limit, 10)),
			Purchase.countDocuments({ 'items.material': req.params.materialId }),
		]);

		res.status(200).json({
			purchases,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page, 10),
			total,
		});
	} catch (err) {
		next(err);
	}
};

exports.getPaymentSummary = async (req, res, next) => {
	try {
		checkValidation(req);
		const summary = await Purchase.aggregate([
			{ $unwind: '$paymentDetails' },
			{
				$group: {
					_id: '$paymentDetails.paymentMethod',
					totalAmount: { $sum: '$paymentDetails.amount' },
					count: { $sum: 1 },
				},
			},
		]);
		res.status(200).json(summary);
	} catch (err) {
		next(err);
	}
};
