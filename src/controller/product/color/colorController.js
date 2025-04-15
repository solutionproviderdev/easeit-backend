/* eslint-disable no-nested-ternary */
const { validationResult } = require('express-validator');
// eslint-disable-next-line import/no-unresolved
const Color = require('../../../schemas/products/color/colorschema');

const createColor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Determine color type and validate accordingly
        const colorType = req.body.prefabricated
            ? 'prefabricated'
            : req.body.formicaLaminated
              ? 'formicaLaminated'
              : req.body.paint
                ? 'paint'
                : null;

        if (!colorType) {
            return res.status(400).json({
                message:
                    'Invalid color type. Must be one of: prefabricated, formicaLaminated, or paint',
            });
        }

        const color = new Color(req.body);
        await color.save();
        res.status(201).json(color);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create color', error: err.message });
    }
};

const updateColor = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const color = await Color.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!color) {
            return res.status(404).json({ message: 'Color not found' });
        }

        res.status(200).json(color);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update color', error: err.message });
    }
};

const deleteColor = async (req, res) => {
    try {
        const color = await Color.findByIdAndDelete(req.params.id);

        if (!color) {
            return res.status(404).json({ message: 'Color not found' });
        }

        res.status(200).json({ message: 'Color deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete color', error: err.message });
    }
};

const getAllColors = async (req, res) => {
    const { search, type, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.$or = [
                { 'prefabricated.spName': { $regex: search, $options: 'i' } },
                { 'formicaLaminated.spName': { $regex: search, $options: 'i' } },
                { 'paint.spName': { $regex: search, $options: 'i' } },
            ];
        }

        if (type) {
            query.type = type;
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const colors = await Color.find(query)
            .sort(sort || { createdAt: -1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(colors);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch colors', error: err.message });
    }
};

const getColorById = async (req, res) => {
    try {
        const color = await Color.findById(req.params.id);

        if (!color) {
            return res.status(404).json({ message: 'Color not found' });
        }

        res.status(200).json(color);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch color', error: err.message });
    }
};

module.exports = {
    createColor,
    updateColor,
    deleteColor,
    getAllColors,
    getColorById,
};
