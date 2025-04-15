const express = require('express');

// Internal Imports
const {
    createEdging,
    updateEdging,
    deleteEdging,
    getAllEdgings,
    getEdgingById,
} = require('../../../controller/product/composite_materials/edgingController');
const {
    validateEdging,
    edgingSearchValidation,
    validateEdgingId,
} = require('../../../validators/product_validators/composite_materials/edgingValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const edgingRouter = express.Router();

// Basic CRUD routes
edgingRouter
    .route('/')
    .get(checkAuth, edgingSearchValidation, getAllEdgings)
    .post(checkAuth, validateEdging, createEdging);

edgingRouter
    .route('/:id')
    .get(checkAuth, validateEdgingId, getEdgingById)
    .put(checkAuth, validateEdgingId, validateEdging, updateEdging)
    .delete(checkAuth, validateEdgingId, deleteEdging);

module.exports = edgingRouter;
