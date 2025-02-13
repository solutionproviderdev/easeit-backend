const express = require('express');
const {
    getAllProductAds,
    getProductAdById,
    createProductAd,
    updateProductAd,
    deleteProductAd,
    addProductAdImage,
    getProductAdsForLead,
} = require('../../controller/ad/productAdController');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

const productAdRouter = express.Router();

// Get all product ads
productAdRouter.get('/', checkAuth, getAllProductAds);

// Get a single product ad by ID
productAdRouter.get('/:id', checkAuth, getProductAdById);

// Create a new product ad
productAdRouter.post('/', checkAuth, createProductAd);

// Update an existing product ad
productAdRouter.put('/:id', checkAuth, updateProductAd);

// Add a new image to an existing product ad
productAdRouter.post('/:id/images', checkAuth, addProductAdImage);

// New route: Get product ads for a specific lead by lead ID
productAdRouter.get('/for-lead/:leadId', checkAuth, getProductAdsForLead);

// Delete a product ad
productAdRouter.delete('/:id', checkAuth, deleteProductAd);

module.exports = productAdRouter;
