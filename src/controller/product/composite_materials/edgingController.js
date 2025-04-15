const { validationResult } = require('express-validator');
// eslint-disable-next-line import/no-unresolved
const Edging = require('../../../schemas/products/composite-materials/edgingschema');

const createEdging = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const edging = new Edging(req.body);
        await edging.save();
        res.status(201).json(edging);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create edging', error: err.message });
    }
};

const updateEdging = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const edging = await Edging.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!edging) {
            return res.status(404).json({ message: 'Edging not found' });
        }

        res.status(200).json(edging);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update edging', error: err.message });
    }
};

const deleteEdging = async (req, res) => {
    try {
        const edging = await Edging.findByIdAndDelete(req.params.id);

        if (!edging) {
            return res.status(404).json({ message: 'Edging not found' });
        }

        res.status(200).json({ message: 'Edging deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete edging', error: err.message });
    }
};

const getAllEdgings = async (req, res) => {
    const { search, catagory, sort, limit, page, fields } = req.query;

    try {
        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (catagory) {
            query.catagory = catagory;
        }

        const projection = fields ? fields.split(',').join(' ') : {};

        const edgings = await Edging.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(edgings);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch edgings', error: err.message });
    }
};

const getEdgingById = async (req, res) => {
    try {
        const edging = await Edging.findById(req.params.id);

        if (!edging) {
            return res.status(404).json({ message: 'Edging not found' });
        }

        res.status(200).json(edging);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch edging', error: err.message });
    }
};

module.exports = {
    createEdging,
    updateEdging,
    deleteEdging,
    getAllEdgings,
    getEdgingById,
};
