const express = require('express');

// Internal Imports
const {
    createThickness,
    updateThickness,
    deleteThickness,
    getAllThickness,
    getThicknessById,
} = require('../../../controller/product/materials/thicknessController');
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
    .get(checkAuth, thicknessSearchValidation, getAllThickness)
    .post(checkAuth, validateThickness, createThickness);

thicknessRouter
    .route('/:id')
    .get(checkAuth, validateThicknessId, getThicknessById)
    .put(checkAuth, validateThicknessId, validateThickness, updateThickness)
    .delete(checkAuth, validateThicknessId, deleteThickness);

module.exports = thicknessRouter;
