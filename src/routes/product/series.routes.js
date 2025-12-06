const express = require('express');

// Internal Imports
const {
    createSeries,
    updateSeries,
    deleteSeries,
    getAllSeries,
    getSeriesById,
} = require('../../controller/product/materials/series.controller');
const {
    validateSeries,
    seriesSearchValidation,
    validateSeriesId,
} = require('../../validators/product_validators/materials/seriesValidator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

const seriesRouter = express.Router();

// Basic CRUD routes
seriesRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Product Series'] */
        /* #swagger.summary = 'Get all series' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, seriesSearchValidation, getAllSeries
    )
    .post(
        /* #swagger.tags = ['Product Series'] */
        /* #swagger.summary = 'Create series' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateSeries, createSeries
    );

seriesRouter
    .route('/:id')
    .get(checkAuth, validateSeriesId, getSeriesById)
    .put(checkAuth, validateSeriesId, validateSeries, updateSeries)
    .delete(checkAuth, validateSeriesId, deleteSeries);

module.exports = seriesRouter;
