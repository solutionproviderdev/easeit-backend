const { validationResult } = require('express-validator');
const Series = require('../../../schemas/products/SeriseSchema');

const createSeries = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const series = new Series(req.body);
        await series.save();
        res.status(201).json(series);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create series', error: err.message });
    }
};

const updateSeries = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const series = await Series.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!series) {
            return res.status(404).json({ message: 'series not found' });
        }

        res.status(200).json(series);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update series', error: err.message });
    }
};

const deleteSeries = async (req, res) => {
    try {
        const series = await Series.findByIdAndDelete(req.params.id);

        if (!series) {
            return res.status(404).json({ message: 'series not found' });
        }

        res.status(200).json({ message: 'series deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete series', error: err.message });
    }
};

const getAllSeries = async (req, res) => {
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

        const series = await Series.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(series);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch series', error: err.message });
    }
};

const getSeriesById = async (req, res) => {
    try {
        const series = await Series.findById(req.params.id);

        if (!series) {
            return res.status(404).json({ message: 'series not found' });
        }

        res.status(200).json(series);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch series', error: err.message });
    }
};

module.exports = {
    createSeries,
    updateSeries,
    deleteSeries,
    getAllSeries,
    getSeriesById,
};
