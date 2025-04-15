const { validationResult } = require('express-validator');
// eslint-disable-next-line import/no-unresolved
const Thickness = require('../../../schemas/products/materials/thicknessschema');

const createThickness = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const thickness = new Thickness(req.body);
        await thickness.save();
        res.status(201).json(thickness);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create thickness', error: err.message });
    }
};

const updateThickness = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const thickness = await Thickness.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!thickness) {
            return res.status(404).json({ message: 'Thickness not found' });
        }

        res.status(200).json(thickness);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update thickness', error: err.message });
    }
};

const deleteThickness = async (req, res) => {
    try {
        const thickness = await Thickness.findByIdAndDelete(req.params.id);

        if (!thickness) {
            return res.status(404).json({ message: 'Thickness not found' });
        }

        res.status(200).json({ message: 'Thickness deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete thickness', error: err.message });
    }
};

const getAllThickness = async (req, res) => {
    const { search, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.value = { $regex: search, $options: 'i' };
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const thickness = await Thickness.find(query)
            .sort(sort || { value: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(thickness);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch thickness', error: err.message });
    }
};

const getThicknessById = async (req, res) => {
    try {
        const thickness = await Thickness.findById(req.params.id);

        if (!thickness) {
            return res.status(404).json({ message: 'Thickness not found' });
        }

        res.status(200).json(thickness);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch thickness', error: err.message });
    }
};

module.exports = {
    createThickness,
    updateThickness,
    deleteThickness,
    getAllThickness,
    getThicknessById,
};
