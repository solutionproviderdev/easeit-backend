const express = require('express');

// Internal Imports
const {
    createBaseMaterial,
    updateBaseMaterial,
    deleteBaseMaterial,
    getAllBaseMaterials,
    getBaseMaterialById,
} = require('../../../controller/product/materials/baseMaterial.controller');
const {
    validateBaseMaterial,
    baseMaterialSearchValidation,
    validateBaseMaterialId,
} = require('../../../validators/product_validators/materials/baseMaterialValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

// Router Declaration
const baseMaterialsRouter = express.Router();

// Route to create a new base material
baseMaterialsRouter.post('/', checkAuth, validateBaseMaterial, createBaseMaterial);

// Route to get all base materials with query parameters
baseMaterialsRouter.get('/', checkAuth, baseMaterialSearchValidation, getAllBaseMaterials);

// Route to get a specific base material by ID
baseMaterialsRouter.get('/:id', checkAuth, validateBaseMaterialId, getBaseMaterialById);

// Route to update a specific base material
baseMaterialsRouter.put(
    '/:id',
    checkAuth,
    validateBaseMaterialId,
    validateBaseMaterial,
    updateBaseMaterial
);

// Route to delete a specific base material
baseMaterialsRouter.delete('/:id', checkAuth, validateBaseMaterialId, deleteBaseMaterial);

module.exports = baseMaterialsRouter;
