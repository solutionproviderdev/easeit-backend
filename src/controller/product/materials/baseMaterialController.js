const { validationResult } = require('express-validator');
const BaseMaterial = require('../../../schemas/products/materials/BaseMaterialSchema');

// Controller to handle creating a new base material
const createBaseMaterial = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const baseMaterial = new BaseMaterial(req.body);
        await baseMaterial.save();
        res.status(201).json(baseMaterial);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create base material', error: err.message });
    }
};

// Controller to handle updating an existing base material
const updateBaseMaterial = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const baseMaterial = await BaseMaterial.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!baseMaterial) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json(baseMaterial);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update base material', error: err.message });
    }
};

// Controller to handle deleting a base material
const deleteBaseMaterial = async (req, res) => {
    try {
        const baseMaterial = await BaseMaterial.findByIdAndDelete(req.params.id);

        if (!baseMaterial) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json({ message: 'Base material deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete base material', error: err.message });
    }
};

// Controller to get all base materials with query parameters
const getAllBaseMaterials = async (req, res) => {
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

        const baseMaterials = await BaseMaterial.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(baseMaterials);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch base materials', error: err.message });
    }
};

// Controller to get a specific base material by ID
const getBaseMaterialById = async (req, res) => {
    try {
        const baseMaterial = await BaseMaterial.findById(req.params.id);

        if (!baseMaterial) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json(baseMaterial);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch base material', error: err.message });
    }
};

module.exports = {
    createBaseMaterial,
    updateBaseMaterial,
    deleteBaseMaterial,
    getAllBaseMaterials,
    getBaseMaterialById,
};
