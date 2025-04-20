const { validationResult } = require('express-validator');
const Hardware = require('../../../schemas/products/materials/HardwareSchema');

const createHardware = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const hardware = new Hardware(req.body);
        await hardware.save();
        res.status(201).json(hardware);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create hardware', error: err.message });
    }
};

const updateHardware = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const hardware = await Hardware.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!hardware) {
            return res.status(404).json({ message: 'Hardware not found' });
        }

        res.status(200).json(hardware);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update hardware', error: err.message });
    }
};

const deleteHardware = async (req, res) => {
    try {
        const hardware = await Hardware.findByIdAndDelete(req.params.id);

        if (!hardware) {
            return res.status(404).json({ message: 'Hardware not found' });
        }

        res.status(200).json({ message: 'Hardware deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete hardware', error: err.message });
    }
};

const getAllHardware = async (req, res) => {
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

        const hardware = await Hardware.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(hardware);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch hardware', error: err.message });
    }
};

const getHardwareById = async (req, res) => {
    try {
        const hardware = await Hardware.findById(req.params.id);

        if (!hardware) {
            return res.status(404).json({ message: 'Hardware not found' });
        }

        res.status(200).json(hardware);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch hardware', error: err.message });
    }
};

module.exports = {
    createHardware,
    updateHardware,
    deleteHardware,
    getAllHardware,
    getHardwareById,
};
