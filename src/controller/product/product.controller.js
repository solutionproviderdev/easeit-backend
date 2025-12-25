const { validationResult } = require('express-validator');
const productService = require('../../services/product.services');

const createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const product = await productService.createProduct(req.body);
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
        const product = await productService.updateProduct(req.params.id, req.body);

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
        const product = await productService.deleteProduct(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete product', error: err.message });
    }
};

const getAllProducts = async (req, res) => {
    const {
        search,
        series,
        minPrice,
        maxPrice,
        status,
        sort,
        limit,
        page,
    } = req.query;

    try {
        const products = await productService.getAllProducts(req.query);

        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch products', error: err.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id);

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
