const Quotation = require('../../schemas/quotation/QuotationSchema');
const AppError = require('../../utils/appError');

// Basic CRUD Operations
exports.getAllQuotations = async (req, res, next) => {
    const { search, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.$or = [
                { 'items.product.name': { $regex: search, $options: 'i' } },
                { 'client.name': { $regex: search, $options: 'i' } },
            ];
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const quotations = await Quotation.find(query)
            .sort(sort || { createdAt: -1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection)
            .populate('client', 'name')
            .populate('items.product', 'name specifications')
            .populate('items.series', 'name');

        const total = await Quotation.countDocuments(query);

        res.status(200).json({
            success: true,
            data: quotations,
            total,
            page: parseInt(page) || 1,
            totalPages: Math.ceil(total / (parseInt(limit) || 10)),
        });
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

// Search and Filter
exports.searchQuotations = async (req, res, next) => {
    try {
        const { query } = req.query;
        const quotations = await Quotation.find({
            'items.name': { $regex: query, $options: 'i' },
        });
        res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
};

exports.filterQuotations = async (req, res, next) => {
    try {
        const { minPrice, maxPrice, startDate, endDate } = req.query;
        const filter = {};

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
exports.getClientSummary = async (req, res, next) => {
    try {
        const quotations = await Quotation.find({ client: req.params.clientId });
        const summary = {
            total: quotations.length,
            totalValue: quotations.reduce((sum, q) => sum + q.finalPrice, 0),
            byStatus: {
                draft: quotations.filter((q) => q.status === 'draft').length,
                sent: quotations.filter((q) => q.status === 'sent').length,
                accepted: quotations.filter((q) => q.status === 'accepted').length,
                rejected: quotations.filter((q) => q.status === 'rejected').length,
                expired: quotations.filter((q) => q.status === 'expired').length,
            },
        };
        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

// Revision functionality
exports.reviseQuotation = async (req, res, next) => {
    try {
        const originalQuotation = await Quotation.findById(req.params.id);
        if (!originalQuotation) return next(new AppError('Quotation not found', 404));

        // Create new quotation with revised data
        const revisedQuotation = new Quotation({
            ...req.body,
            status: 'draft',
        });
        await revisedQuotation.save();

        res.status(201).json({ success: true, data: revisedQuotation });
    } catch (error) {
        next(error);
    }
};

// Analytics
exports.getMonthlyAnalytics = async (req, res, next) => {
    try {
        const analytics = await Quotation.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    totalValue: { $sum: '$finalPrice' },
                    accepted: {
                        $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
                    },
                },
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
        ]);
        res.json({ success: true, data: analytics });
    } catch (error) {
        next(error);
    }
};

exports.getConversionRate = async (req, res, next) => {
    try {
        const stats = await Quotation.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    accepted: {
                        $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    accepted: 1,
                    conversionRate: {
                        $multiply: [{ $divide: ['$accepted', '$total'] }, 100],
                    },
                },
            },
        ]);
        res.json({ success: true, data: stats[0] || { total: 0, accepted: 0, conversionRate: 0 } });
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

// Get all quotations for a specific client
exports.getClientQuotations = async (req, res, next) => {
    try {
        const quotations = await Quotation.find({ client: req.params.clientId })
            .sort('-createdAt')
            .populate('client');

        if (!quotations.length) {
            return next(new AppError('No quotations found for this client', 404));
        }

        res.json({
            success: true,
            count: quotations.length,
            data: quotations,
        });
    } catch (error) {
        next(error);
    }
};

// Get overall quotation statistics
exports.getQuotationStats = async (req, res, next) => {
    try {
        const stats = await Quotation.aggregate([
            {
                $facet: {
                    statusStats: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                totalValue: { $sum: '$finalPrice' },
                            },
                        },
                    ],
                    overallStats: [
                        {
                            $group: {
                                _id: null,
                                totalQuotations: { $sum: 1 },
                                totalValue: { $sum: '$finalPrice' },
                                avgValue: { $avg: '$finalPrice' },
                                minValue: { $min: '$finalPrice' },
                                maxValue: { $max: '$finalPrice' },
                            },
                        },
                    ],
                    monthlyStats: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$createdAt' },
                                    month: { $month: '$createdAt' },
                                },
                                count: { $sum: 1 },
                                totalValue: { $sum: '$finalPrice' },
                            },
                        },
                        { $sort: { '_id.year': -1, '_id.month': -1 } },
                    ],
                },
            },
        ]);

        res.json({
            success: true,
            data: {
                byStatus: stats[0].statusStats,
                overall: stats[0].overallStats[0],
                monthly: stats[0].monthlyStats,
            },
        });
    } catch (error) {
        next(error);
    }
};
