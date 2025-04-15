const express = require('express');

// Internal Imports
const {
    createColor,
    updateColor,
    deleteColor,
    getAllColors,
    getColorById,
} = require('../../../controller/product/color/colorController');
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
    .get(checkAuth, colorSearchValidation, getAllColors)
    .post(checkAuth, validateColor, createColor);

colorRouter
    .route('/:id')
    .get(checkAuth, validateColorId, getColorById)
    .put(checkAuth, validateColorId, validateColor, updateColor)
    .delete(checkAuth, validateColorId, deleteColor);

module.exports = colorRouter;
