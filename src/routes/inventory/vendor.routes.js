const express = require('express');

const vendorRouter = express.Router();
const vendorController = require('../../controller/inventory/vendor.controller');
const { validateVendor } = require('../../validators/inventory/vendor.validator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');
const { checkAdmin } = require('../../middlewares/auth/checkAdmin');

// Basic CRUD routes
vendorRouter.get('/', checkAuth, vendorController.getAllVendors);
vendorRouter.get('/:id', checkAuth, vendorController.getVendorById);
vendorRouter.post('/', checkAuth, checkAdmin, validateVendor, vendorController.createVendor);
vendorRouter.put('/:id', checkAuth, checkAdmin, validateVendor, vendorController.updateVendor);
vendorRouter.delete('/:id', checkAuth, checkAdmin, vendorController.deleteVendor);

// Contact management routes
vendorRouter.post('/:id/contacts', checkAuth, checkAdmin, vendorController.addContact);
vendorRouter.put('/:id/contacts/:contactId', checkAuth, checkAdmin, vendorController.updateContact);
vendorRouter.delete(
    '/:id/contacts/:contactId',
    checkAuth,
    checkAdmin,
    vendorController.deleteContact
);
vendorRouter.put(
    '/:id/contacts/:contactId/primary',
    checkAuth,
    checkAdmin,
    vendorController.setPrimaryContact
);

// Material management routes
vendorRouter.post('/:id/materials', checkAuth, checkAdmin, vendorController.addMaterial);
vendorRouter.put(
    '/:id/materials/:materialId',
    checkAuth,
    checkAdmin,
    vendorController.updateMaterial
);
vendorRouter.delete(
    '/:id/materials/:materialId',
    checkAuth,
    checkAdmin,
    vendorController.deleteMaterial
);
vendorRouter.put(
    '/:id/materials/:materialId/status',
    checkAuth,
    checkAdmin,
    vendorController.toggleMaterialStatus
);

module.exports = vendorRouter;
