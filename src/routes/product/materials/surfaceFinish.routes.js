const express = require('express');

// Internal Imports
const {
    createSurfaceFinish,
    updateSurfaceFinish,
    deleteSurfaceFinish,
    getAllSurfaceFinish,
    getSurfaceFinishById,
} = require('../../../controller/product/materials/surfaceFinish.controller');
const {
    validateSurfaceFinish,
    surfaceFinishSearchValidation,
    validateSurfaceFinishId,
} = require('../../../validators/product_validators/materials/surfaceFinishValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const surfaceFinishRouter = express.Router();

// Basic CRUD routes
surfaceFinishRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Get all surface finishes' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, surfaceFinishSearchValidation, getAllSurfaceFinish
    )
    .post(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Create surface finish' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateSurfaceFinish, createSurfaceFinish
    );

surfaceFinishRouter
    .route('/:id')
    .get(checkAuth, validateSurfaceFinishId, getSurfaceFinishById)
    .put(checkAuth, validateSurfaceFinishId, validateSurfaceFinish, updateSurfaceFinish)
    .delete(checkAuth, validateSurfaceFinishId, deleteSurfaceFinish);

module.exports = surfaceFinishRouter;
