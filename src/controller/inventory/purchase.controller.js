const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Purchase = require('../../schemas/inventory/purchase.model');

// Helper function to check validation results
const checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
};

// Basic CRUD Operations
exports.getAllPurchases = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status, vendor, startDate, endDate } = req.query;
        const query = {};

        if (status) query.status = status;
        if (vendor) query.vendor = vendor;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const purchases = await Purchase.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Purchase.countDocuments(query);

        res.status(200).json({
            purchases,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        next(error);
    }
};

exports.getPurchaseById = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.createPurchase = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = new Purchase(req.body);
        const result = await purchase.save();
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

exports.updatePurchase = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.deletePurchase = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        if (purchase.status !== 'draft') {
            const error = new Error('Only draft purchases can be deleted');
            error.statusCode = 400;
            throw error;
        }
        await purchase.remove();
        res.status(200).json({ message: 'Purchase deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Status Management
exports.updateStatus = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.receiveItem = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        const item = purchase.items.id(req.params.itemId);
        if (!item) {
            const error = new Error('Item not found');
            error.statusCode = 404;
            throw error;
        }

        if (req.body.receivedQuantity > item.quantity) {
            const error = new Error('Received quantity cannot exceed ordered quantity');
            error.statusCode = 400;
            throw error;
        }

        item.receivedQuantity = req.body.receivedQuantity;
        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.cancelPurchase = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

// Payment Management
exports.addPayment = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        const totalPaid = purchase.paymentDetails.reduce((sum, payment) => sum + payment.amount, 0);
        req.body.amount;
        if (totalPaid > purchase.totalAmount) {
            const error = new Error('Total payments cannot exceed purchase amount');
            error.statusCode = 400;
            throw error;
        }

        purchase.paymentDetails.push(req.body);
        purchase.paymentStatus = totalPaid === purchase.totalAmount ? 'paid' : 'partially_paid';
        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.updatePayment = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        const paymentIndex = purchase.paymentDetails.findIndex(
            (payment) => payment._id.toString() === req.params.paymentId
        );
        if (paymentIndex === -1) {
            const error = new Error('Payment not found');
            error.statusCode = 404;
            throw error;
        }

        purchase.paymentDetails[paymentIndex] = {
            ...purchase.paymentDetails[paymentIndex].toObject(),
            ...req.body,
        };

        const totalPaid = purchase.paymentDetails.reduce((sum, payment) => sum + payment.amount, 0);
        purchase.paymentStatus = totalPaid === purchase.totalAmount ? 'paid' : 'partially_paid';

        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.deletePayment = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        purchase.paymentDetails = purchase.paymentDetails.filter(
            (payment) => payment._id.toString() !== req.params.paymentId
        );

        const totalPaid = purchase.paymentDetails.reduce((sum, payment) => sum + payment.amount, 0);
        purchase.paymentStatus = totalPaid === 0 ? 'pending' : 'partially_paid';

        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.getPaymentHistory = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json(purchase.paymentDetails);
    } catch (error) {
        next(error);
    }
};

// Document Management
exports.addAttachment = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        const attachment = {
            name: req.body.name,
            url: req.body.url,
            type: req.body.type,
        };

        purchase.attachments.push(attachment);
        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

exports.removeAttachment = async (req, res, next) => {
    try {
        checkValidation(req);
        const purchase = await Purchase.findById(req.params.id);
        if (!purchase) {
            const error = new Error('Purchase not found');
            error.statusCode = 404;
            throw error;
        }

        purchase.attachments = purchase.attachments.filter(
            (attachment) => attachment._id.toString() !== req.params.attachmentId
        );
        await purchase.save();
        res.status(200).json(purchase);
    } catch (error) {
        next(error);
    }
};

// Reports and Analytics
exports.getPurchaseStatistics = async (req, res, next) => {
    try {
        checkValidation(req);
        const stats = await Purchase.aggregate([
            {
                $facet: {
                    statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                    totalAmount: [{ $group: { _id: null, total: { $sum: '$totalAmount' } } }],
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
    } catch (error) {
        next(error);
    }
};

exports.getVendorPurchaseHistory = async (req, res, next) => {
    try {
        checkValidation(req);
        const { page = 1, limit = 10 } = req.query;
        const purchases = await Purchase.find({ vendor: req.params.vendorId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Purchase.countDocuments({ vendor: req.params.vendorId });

        res.status(200).json({
            purchases,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        next(error);
    }
};

exports.getMaterialPurchaseHistory = async (req, res, next) => {
    try {
        checkValidation(req);
        const { page = 1, limit = 10 } = req.query;
        const purchases = await Purchase.find({ 'items.material': req.params.materialId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Purchase.countDocuments({ 'items.material': req.params.materialId });

        res.status(200).json({
            purchases,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
        });
    } catch (error) {
        next(error);
    }
};

exports.getPaymentSummary = async (req, res, next) => {
    try {
        checkValidation(req);
        const summary = await Purchase.aggregate([
            {
                $unwind: '$paymentDetails',
            },
            {
                $group: {
                    _id: '$paymentDetails.paymentMethod',
                    totalAmount: { $sum: '$paymentDetails.amount' },
                    count: { $sum: 1 },
                },
            },
        ]);
        res.status(200).json(summary);
    } catch (error) {
        next(error);
    }
};
