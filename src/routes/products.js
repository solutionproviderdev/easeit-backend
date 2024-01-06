const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    addProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
    deleteProduct,
} = require('../controller/productController');

// Router Declaration
const productRouter = express.Router();

// Get All Products
productRouter.get('/', checkLogin, getAllProducts);

// Get Single Product
productRouter.get('/:id', checkLogin, getSingleProduct);

// Add a Single Product
productRouter.post('/', checkLogin, addProduct);

// Update Product Details
productRouter.put('/:id', checkLogin, updateProduct);

// Delete a Product
productRouter.delete('/:id', checkLogin, deleteProduct);

module.exports = productRouter;
