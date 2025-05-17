const { validationResult } = require('express-validator');
const createError = require('http-errors');
const HardwareItems = require('../../../schemas/products/materials/hardware/HardwareItemsSchema');

// Create a new hardware item
exports.createHardwareItem = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError(400, 'Validation Error', { errors: errors.array() });
        }

        const hardwareItem = new HardwareItems(req.body);
        const savedItem = await hardwareItem.save();

        res.status(201).json({
            success: true,
            data: savedItem,
        });
    } catch (error) {
        next(error);
    }
};

// Get all hardware items with filtering and pagination
exports.getHardwareItems = async (req, res, next) => {
    try {
        const { search, useTypes, sort = 'name', page = 1, limit = 10 } = req.query;

        const query = { active: true };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (useTypes) {
            query.useTypes = { $in: useTypes.split(',') };
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 },
        };

        const items = await HardwareItems.find(query)
            .skip((options.page - 1) * options.limit)
            .limit(options.limit)
            .sort(options.sort);

        const total = await HardwareItems.countDocuments(query);

        res.json({
            success: true,
            data: items,
            pagination: {
                total,
                page: options.page,
                pages: Math.ceil(total / options.limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get a single hardware item by ID
exports.getHardwareItem = async (req, res, next) => {
    try {
        const item = await HardwareItems.findById(req.params.id);
        if (!item) {
            throw createError(404, 'Hardware item not found');
        }
        res.json({
            success: true,
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

// Update a hardware item
exports.updateHardwareItem = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError(400, 'Validation Error', { errors: errors.array() });
        }

        const item = await HardwareItems.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!item) {
            throw createError(404, 'Hardware item not found');
        }

        res.json({
            success: true,
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

// Delete a hardware item (soft delete)
exports.deleteHardwareItem = async (req, res, next) => {
    try {
        const item = await HardwareItems.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!item) {
            throw createError(404, 'Hardware item not found');
        }

        res.json({
            success: true,
            message: 'Hardware item deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get low stock items
exports.getLowStockItems = async (req, res, next) => {
    try {
        const items = await HardwareItems.findLowStock();
        res.json({
            success: true,
            data: items,
        });
    } catch (error) {
        next(error);
    }
};
