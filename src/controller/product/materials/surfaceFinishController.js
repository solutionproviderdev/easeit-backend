const { validationResult } = require('express-validator');
const SurfaceFinish = require('../../../schemas/products/materials/SurfaceFinishSchema');

const createSurfaceFinish = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const surfaceFinish = new SurfaceFinish(req.body);
        await surfaceFinish.save();
        res.status(201).json(surfaceFinish);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create surface finish', error: err.message });
    }
};

const updateSurfaceFinish = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const surfaceFinish = await SurfaceFinish.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!surfaceFinish) {
            return res.status(404).json({ message: 'Surface finish not found' });
        }

        res.status(200).json(surfaceFinish);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update surface finish', error: err.message });
    }
};

const deleteSurfaceFinish = async (req, res) => {
    try {
        const surfaceFinish = await SurfaceFinish.findByIdAndDelete(req.params.id);

        if (!surfaceFinish) {
            return res.status(404).json({ message: 'Surface finish not found' });
        }

        res.status(200).json({ message: 'Surface finish deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete surface finish', error: err.message });
    }
};

const getAllSurfaceFinish = async (req, res) => {
    const { search, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const surfaceFinish = await SurfaceFinish.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(surfaceFinish);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch surface finishes', error: err.message });
    }
};

const getSurfaceFinishById = async (req, res) => {
    try {
        const surfaceFinish = await SurfaceFinish.findById(req.params.id);

        if (!surfaceFinish) {
            return res.status(404).json({ message: 'Surface finish not found' });
        }

        res.status(200).json(surfaceFinish);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch surface finish', error: err.message });
    }
};

module.exports = {
    createSurfaceFinish,
    updateSurfaceFinish,
    deleteSurfaceFinish,
    getAllSurfaceFinish,
    getSurfaceFinishById,
};
