const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Purchase = require('../../schemas/inventory/purchase.model');
const Vendor = require('../../schemas/inventory/vendor.model');

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

// Helper function to generate purchase number
const generatePurchaseNumber = async () => {
    const currentYear = new Date().getFullYear();
    const latestPurchase = await Purchase.findOne(
        { purchaseNumber: new RegExp(`^PO-${currentYear}-`) },
        {},
        { sort: { purchaseNumber: -1 } }
    );

    let nextNumber = 1;
    if (latestPurchase) {
        const currentNumber = parseInt(latestPurchase.purchaseNumber.split('-')[2]);
        nextNumber = currentNumber + 1;
    }

    return `PO-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
};

// Helper function to process purchase items
const processPurchaseItems = async (items, vendorId) => {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    return Promise.all(
        items.map(async (item) => {
            const vendorMaterial = vendor.materials.id(item.vendorMaterial);
            if (!vendorMaterial) {
                throw new Error(`Vendor material not found: ${item.vendorMaterial}`);
            }

            // Update material price in the respective collection based on type
            const MaterialModel = mongoose.model(vendorMaterial.type);
            await MaterialModel.findByIdAndUpdate(vendorMaterial.material, {
                unitPrice: item.pricePerUnit,
            });

            return {
                vendorMaterial: item.vendorMaterial,
                material: vendorMaterial.material,
                materialType: vendorMaterial.type,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                totalPrice: item.quantity * item.pricePerUnit,
            };
        })
    );
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

        // Generate purchase number
        const purchaseNumber = await generatePurchaseNumber();

        // Process items
        const processedItems = await processPurchaseItems(req.body.items, req.body.vendor);

        // Calculate items total
        const itemsTotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

        // Calculate additional costs total
        const additionalCostsTotal = req.body.additionalCost
            ? req.body.additionalCost.reduce((sum, cost) => sum + (cost.amount || 0), 0)
            : 0;

        // Calculate final total amount
        const totalAmount = itemsTotal + additionalCostsTotal;

        const purchase = new Purchase({
            ...req.body,
            purchaseNumber,
            items: processedItems,
            totalAmount, // Override total amount with calculated value
        });

        const result = await purchase.save();
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

exports.updatePurchase = async (req, res, next) => {
    try {
        checkValidation(req);

        // If items are being updated, process them
        let processedItems;
        if (req.body.items) {
            processedItems = await processPurchaseItems(req.body.items, req.body.vendor);

            // Calculate new total amount
            const itemsTotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const additionalCostsTotal = req.body.additionalCost
                ? req.body.additionalCost.reduce((sum, cost) => sum + (cost.amount || 0), 0)
                : 0;
            req.body.totalAmount = itemsTotal + additionalCostsTotal;
            req.body.items = processedItems;
        }

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
        if (totalPaid + req.body.amount > purchase.totalAmount) {
            const error = new Error('Total payments cannot exceed purchase amount');
            error.statusCode = 400;
            throw error;
        }

        purchase.paymentDetails.push(req.body);

        // Update payment status
        const newTotalPaid = totalPaid + req.body.amount;
        if (newTotalPaid >= purchase.totalAmount) {
            purchase.paymentStatus = 'paid';
        } else if (newTotalPaid > 0) {
            purchase.paymentStatus = 'partially_paid';
        }

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

// Bulk Purchase Creation
exports.createBulkPurchase = async (req, res, next) => {
    try {
        checkValidation(req);

        const { vendor, purchases, additionalCost } = req.body;

        // Calculate total additional cost
        const totalAdditionalCost = additionalCost
            ? additionalCost.reduce((sum, cost) => sum + (cost.amount || 0), 0)
            : 0;

        // Calculate per purchase additional cost
        const additionalCostPerPurchase = totalAdditionalCost / purchases.length;

        // Process each purchase
        const purchasePromises = purchases.map(async (purchaseData) => {
            // Generate purchase number
            const purchaseNumber = await generatePurchaseNumber();

            // Process items
            const processedItems = await processPurchaseItems(purchaseData.items, vendor);

            // Calculate items total
            const itemsTotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

            // Create individual additional cost array for each purchase
            const individualAdditionalCost = additionalCost
                ? additionalCost.map((cost) => ({
                      name: cost.name,
                      amount: cost.amount / purchases.length,
                  }))
                : [];

            // Create purchase object
            return new Purchase({
                purchaseNumber,
                vendor,
                items: processedItems,
                additionalCost: individualAdditionalCost,
                totalAmount: itemsTotal + additionalCostPerPurchase,
            });
        });

        // Save all purchases
        const createdPurchases = await Promise.all(
            purchasePromises.map((p) => p.then((purchase) => purchase.save()))
        );

        res.status(201).json({
            message: 'Bulk purchase created successfully',
            purchases: createdPurchases,
        });
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
        if (totalPaid + req.body.amount > purchase.totalAmount) {
            const error = new Error('Total payments cannot exceed purchase amount');
            error.statusCode = 400;
            throw error;
        }

        purchase.paymentDetails.push(req.body);

        // Update payment status
        const newTotalPaid = totalPaid + req.body.amount;
        if (newTotalPaid >= purchase.totalAmount) {
            purchase.paymentStatus = 'paid';
        } else if (newTotalPaid > 0) {
            purchase.paymentStatus = 'partially_paid';
        }

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
