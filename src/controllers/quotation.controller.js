const Quotation = require('../schemas/quotation/QuotationSchema');
const AppError = require('../utils/appError');

// Basic CRUD Operations
exports.getAllQuotations = async (req, res, next) => {
    try {
        const quotations = await Quotation.find().sort('-createdAt');
        res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
};

exports.createQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.create(req.body);
        res.status(201).json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

exports.getQuotationById = async (req, res, next) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

exports.updateQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

exports.deleteQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.findByIdAndDelete(req.params.id);
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: null });
    } catch (error) {
        next(error);
    }
};

// Status Management
exports.updateStatus = async (req, res, next) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

exports.approveQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            { status: 'accepted' },
            { new: true }
        );
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

exports.rejectQuotation = async (req, res, next) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected' },
            { new: true }
        );
        if (!quotation) return next(new AppError('Quotation not found', 404));
        res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
};

// Search and Filter
exports.searchQuotations = async (req, res, next) => {
    try {
        const { query } = req.query;
        const quotations = await Quotation.find({
            $or: [
                { 'items.name': { $regex: query, $options: 'i' } },
                { status: { $regex: query, $options: 'i' } },
            ],
        });
        res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
};

exports.filterQuotations = async (req, res, next) => {
    try {
        const { status, minPrice, maxPrice, startDate, endDate } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (minPrice || maxPrice) {
            filter.finalPrice = {};
            if (minPrice) filter.finalPrice.$gte = minPrice;
            if (maxPrice) filter.finalPrice.$lte = maxPrice;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const quotations = await Quotation.find(filter);
        res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
};

// Client-specific Operations
exports.getClientQuotations = async (req, res, next) => {
    try {
        const quotations = await Quotation.find({ client: req.params.clientId });
        res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
};

// Analytics
exports.getQuotationStats = async (req, res, next) => {
    try {
        const stats = await Quotation.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$finalPrice' },
                },
            },
        ]);
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
};

// Export functionality placeholders
exports.generatePDF = async (req, res, next) => {
    try {
        // Implement PDF generation logic
        res.json({ success: true, message: 'PDF generation not implemented yet' });
    } catch (error) {
        next(error);
    }
};

exports.exportQuotation = async (req, res, next) => {
    try {
        // Implement export logic
        res.json({ success: true, message: 'Export functionality not implemented yet' });
    } catch (error) {
        next(error);
    }
};
