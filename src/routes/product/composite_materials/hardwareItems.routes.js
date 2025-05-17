const express = require('express');

const hardwareItemRouter = express.Router();

const {
    createHardwareItem,
    getHardwareItems,
    getHardwareItem,
    updateHardwareItem,
    deleteHardwareItem,
    getLowStockItems,
} = require('../../../controller/product/composite_materials/hardwareItems.controller');
const {
    validateHardwareItem,
    hardwareItemSearchValidation,
    validateHardwareItemId,
} = require('../../../validators/product_validators/materials/hardwareItemsValidator');

// Create a new hardware item
hardwareItemRouter.post('/', validateHardwareItem, createHardwareItem);

// Get all hardware items with filtering and pagination
hardwareItemRouter.get('/', hardwareItemSearchValidation, getHardwareItems);

// Get low stock items
hardwareItemRouter.get('/low-stock', getLowStockItems);

// Get a single hardware item by ID
hardwareItemRouter.get('/:id', validateHardwareItemId, getHardwareItem);

// Update a hardware item
hardwareItemRouter.put('/:id', [validateHardwareItemId, validateHardwareItem], updateHardwareItem);

// Delete a hardware item (soft delete)
hardwareItemRouter.delete('/:id', validateHardwareItemId, deleteHardwareItem);

module.exports = hardwareItemRouter;
