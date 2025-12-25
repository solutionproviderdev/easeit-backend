const express = require('express');

const {
    createGlass,
    updateGlass,
    deleteGlass,
    getAllGlass,
    getGlassById,
} = require('../../../controller/product/composite_materials/glass.controller');
const {
    validateGlass,
    glassSearchValidation,
    validateGlassId,
} = require('../../../validators/product_validators/materials/glassValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const glassRouter = express.Router();

// Basic CRUD routes
glassRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Get all glass' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, glassSearchValidation, getAllGlass
    )
    .post(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Create glass' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateGlass, createGlass
    );

glassRouter
    .route('/:id')
    .get(checkAuth, validateGlassId, getGlassById)
    .put(checkAuth, validateGlassId, validateGlass, updateGlass)
    .delete(checkAuth, validateGlassId, deleteGlass);

module.exports = glassRouter;
