const express = require('express');

// Internal Imports
const {
    createBrand,
    updateBrand,
    deleteBrand,
    getAllBrands,
    getBrandById,
} = require('../../../controller/product/materials/brand.controller');
const {
    validateBrand,
    brandSearchValidation,
    validateBrandId,
} = require('../../../validators/product_validators/materials/brandValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

// Router Declaration
const brandsRouter = express.Router();

// Route to create a new brand
brandsRouter.post('/', checkAuth, validateBrand, createBrand);

// Route to get all brands with query parameters
brandsRouter.get('/', checkAuth, brandSearchValidation, getAllBrands);

// Route to get a specific brand by ID
brandsRouter.get('/:id', checkAuth, validateBrandId, getBrandById);

// Route to update a specific brand
brandsRouter.put('/:id', checkAuth, validateBrandId, validateBrand, updateBrand);

// Route to delete a specific brand
brandsRouter.delete('/:id', checkAuth, validateBrandId, deleteBrand);

module.exports = brandsRouter;
