const { validationResult } = require('express-validator');
const Brand = require('../../../schemas/products/materials/BrandSchema');

// Controller to handle creating a new brand
const createBrand = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const brand = new Brand(req.body);
        await brand.save();
        res.status(201).json(brand);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create base material', error: err.message });
    }
};

// Controller to handle updating an existing brand
const updateBrand = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        if (!brand) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json(brand);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update base material', error: err.message });
    }
};

// Controller to handle deleting a brand
const deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);

        if (!brand) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json({ message: 'Base material deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete base material', error: err.message });
    }
};

// Controller to get all brands with query parameters
const getAllBrands = async (req, res) => {
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

        const brands = await Brand.find(query)
            .sort(sort || { name: 1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(brands);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch base materials', error: err.message });
    }
};

// Controller to get a specific brand by ID
const getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({ message: 'Base material not found' });
        }

        res.status(200).json(brand);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch base material', error: err.message });
    }
};

module.exports = {
    createBrand,
    updateBrand,
    deleteBrand,
    getAllBrands,
    getBrandById,
};
