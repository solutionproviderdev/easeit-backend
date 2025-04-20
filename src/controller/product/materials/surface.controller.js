const { validationResult } = require('express-validator');
const Surface = require('../../../schemas/products/materials/SurfaceSchema');

const createSurface = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const surface = new Surface(req.body);
        await surface.save();
        res.status(201).json(surface);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create surface', error: err.message });
    }
};

const updateSurface = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const surface = await Surface.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!surface) {
            return res.status(404).json({ message: 'surface not found' });
        }

        res.status(200).json(surface);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update surface', error: err.message });
    }
};

const deleteSurface = async (req, res) => {
    try {
        const surface = await Surface.findByIdAndDelete(req.params.id);

        if (!surface) {
            return res.status(404).json({ message: 'surface not found' });
        }

        res.status(200).json({ message: 'surface deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete surface', error: err.message });
    }
};

const getAllSurfaces = async (req, res) => {
    const {
 search, sort, limit, page, fields 
} = req.query;

    try {
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const surface = await Surface.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(surface);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch surface', error: err.message });
    }
};

const getSurfaceById = async (req, res) => {
    try {
        const surface = await Surface.findById(req.params.id);

        if (!surface) {
            return res.status(404).json({ message: 'surface not found' });
        }

        res.status(200).json(surface);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch surface', error: err.message });
    }
};

module.exports = {
    createSurface,
    updateSurface,
    deleteSurface,
    getAllSurfaces,
    getSurfaceById,
};
