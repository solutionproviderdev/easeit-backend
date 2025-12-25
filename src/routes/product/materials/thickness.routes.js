const express = require('express');

// Internal Imports
const {
    createThickness,
    updateThickness,
    deleteThickness,
    getAllThickness,
    getThicknessById,
} = require('../../../controller/product/materials/thickness.controller');
const {
    validateThickness,
    thicknessSearchValidation,
    validateThicknessId,
} = require('../../../validators/product_validators/materials/thicknessValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const thicknessRouter = express.Router();

// Basic CRUD routes
thicknessRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Get all thicknesses' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, thicknessSearchValidation, getAllThickness
    )
    .post(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Create thickness' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateThickness, createThickness
    );

thicknessRouter
    .route('/:id')
    .get(checkAuth, validateThicknessId, getThicknessById)
    .put(checkAuth, validateThicknessId, validateThickness, updateThickness)
    .delete(checkAuth, validateThicknessId, deleteThickness);

module.exports = thicknessRouter;
