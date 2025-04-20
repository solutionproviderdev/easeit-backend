const express = require('express');

// Internal Imports
const {
    createSurface,
    updateSurface,
    deleteSurface,
    getAllSurfaces,
    getSurfaceById,
} = require('../../../controller/product/materials/surface.controller');
const {
    validateSurface,
    surfaceSearchValidation,
    validateSurfaceId,
} = require('../../../validators/product_validators/materials/surfaceValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const surfaceRouter = express.Router();

// Basic CRUD routes
surfaceRouter
    .route('/')
    .get(checkAuth, surfaceSearchValidation, getAllSurfaces)
    .post(checkAuth, validateSurface, createSurface);

surfaceRouter
    .route('/:id')
    .get(checkAuth, validateSurfaceId, getSurfaceById)
    .put(checkAuth, validateSurfaceId, validateSurface, updateSurface)
    .delete(checkAuth, validateSurfaceId, deleteSurface);

module.exports = surfaceRouter;
