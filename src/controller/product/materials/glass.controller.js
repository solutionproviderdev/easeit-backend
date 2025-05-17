const { validationResult } = require('express-validator');
const Glass = require('../../../schemas/products/materials/GlassSchema');

const createGlass = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const glass = new Glass(req.body);
        await glass.save();
        res.status(201).json(glass);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create glass', error: err.message });
    }
};

const updateGlass = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const glass = await Glass.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!glass) {
            return res.status(404).json({ message: 'Glass not found' });
        }

        res.status(200).json(glass);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update glass', error: err.message });
    }
};

const deleteGlass = async (req, res) => {
    try {
        const glass = await Glass.findByIdAndDelete(req.params.id);

        if (!glass) {
            return res.status(404).json({ message: 'Glass not found' });
        }

        res.status(200).json({ message: 'Glass deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete glass', error: err.message });
    }
};

const getAllGlass = async (req, res) => {
    const { search, type, color, thickness, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (type) query.type = type;
        if (color) query.color = color;
        if (thickness) query.thickness = thickness;

        const projection = fields ? fields.split(',').join(' ') : {};

        const glasses = await Glass.find(query)
            .sort(sort || { createdAt: -1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(glasses);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch glasses', error: err.message });
    }
};

const getGlassById = async (req, res) => {
    try {
        const glass = await Glass.findById(req.params.id);

        if (!glass) {
            return res.status(404).json({ message: 'Glass not found' });
        }

        res.status(200).json(glass);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch glass', error: err.message });
    }
};

module.exports = {
    createGlass,
    updateGlass,
    deleteGlass,
    getAllGlass,
    getGlassById,
};