const { validationResult } = require('express-validator');
const Product = require('../../schemas/products/ProductSchema');

const createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create product', error: err.message });
    }
};

const updateProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update product', error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete product', error: err.message });
    }
};

const getAllProducts = async (req, res) => {
    const { search, series, minPrice, maxPrice, status, sort, limit, page } = req.query;

    try {
        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (series) {
            query['specifications.series'] = series;
        }

        if (minPrice || maxPrice) {
            query['specifications.pricePerSqFt'] = {};
            if (minPrice) query['specifications.pricePerSqFt'].$gte = parseFloat(minPrice);
            if (maxPrice) query['specifications.pricePerSqFt'].$lte = parseFloat(maxPrice);
        }

        if (status) {
            query.productStatus = status;
        }

        const products = await Product.find(query)
            .sort(sort || { createdAt: -1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0);

        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch products', error: err.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch product', error: err.message });
    }
};

module.exports = {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
};
