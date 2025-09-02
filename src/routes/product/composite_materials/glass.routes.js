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
    .get(checkAuth, glassSearchValidation, getAllGlass)
    .post(checkAuth, validateGlass, createGlass);

glassRouter
    .route('/:id')
    .get(checkAuth, validateGlassId, getGlassById)
    .put(checkAuth, validateGlassId, validateGlass, updateGlass)
    .delete(checkAuth, validateGlassId, deleteGlass);

module.exports = glassRouter;
