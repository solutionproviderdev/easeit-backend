const express = require('express');

// Internal Imports
const {
    createColor,
    updateColor,
    deleteColor,
    getAllColors,
    getColorById,
} = require('../../../controller/product/color/color.controller');
const {
    validateColor,
    colorSearchValidation,
    validateColorId,
} = require('../../../validators/product_validators/color/colorValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const colorRouter = express.Router();

// Basic CRUD routes
colorRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Product Colors'] */
        /* #swagger.summary = 'Get all colors' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, colorSearchValidation, getAllColors
    )
    .post(
        /* #swagger.tags = ['Product Colors'] */
        /* #swagger.summary = 'Create color' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateColor, createColor
    );

colorRouter
    .route('/:id')
    .get(checkAuth, validateColorId, getColorById)
    .put(checkAuth, validateColorId, validateColor, updateColor)
    .delete(checkAuth, validateColorId, deleteColor);

module.exports = colorRouter;
