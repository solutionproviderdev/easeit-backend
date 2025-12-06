const express = require('express');

// Internal Imports
const {
    createHardware,
    updateHardware,
    deleteHardware,
    getAllHardware,
    getHardwareById,
} = require('../../../controller/product/materials/hardwear.controller');
const {
    validateHardware,
    hardwareSearchValidation,
    validateHardwareId,
} = require('../../../validators/product_validators/materials/hardwearValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const hardwareRouter = express.Router();

// Basic CRUD routes
hardwareRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Get all hardware (material)' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, hardwareSearchValidation, getAllHardware
    )
    .post(
        /* #swagger.tags = ['Product Materials'] */
        /* #swagger.summary = 'Create hardware (material)' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateHardware, createHardware
    );

hardwareRouter
    .route('/:id')
    .get(checkAuth, validateHardwareId, getHardwareById)
    .put(checkAuth, validateHardwareId, validateHardware, updateHardware)
    .delete(checkAuth, validateHardwareId, deleteHardware);

module.exports = hardwareRouter;
