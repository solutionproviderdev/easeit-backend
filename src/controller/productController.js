const generateSKU = require('../helpers/SKUGenerator');
const Product = require('../schemas/ProductSchema');

// Add a new product
const addProduct = async (req, res) => {
    const product = req.body;
    try {
        const skuCode = await generateSKU(product);

        const newProduct = new Product({ ...product, SKU: skuCode });
        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (error) {
        res.status(500).json({ message: `Error adding product: ${error.message}` });
    }
};

// Retrieve all products
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: `Error retrieving products: ${error.message}` });
    }
};

// Retrieve a single product by ID
const getSingleProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: `Error finding product: ${error.message}` });
    }
};

// Update a product by ID
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: `Error updating product: ${error.message}` });
    }
};

// Delete a product by ID
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting product: ${error.message}` });
    }
};

module.exports = {
    addProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
};
