const express = require('express');
const {
    getLeadControl,
    getManualOverrides,
    getManualOverrideById,
    createManualOverride,
    updateManualOverride,
    deleteManualOverride,
    updateGlobalSettings,
    updateAutoMessage,
} = require('../../../controller/settings/leadControlController');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const leadControlRouter = express.Router();

// Get entire lead control settings document
leadControlRouter.get('/', checkAuth, getLeadControl);

// Update global lead control settings
leadControlRouter.patch('/global', checkAuth, updateGlobalSettings);

// Get all manual overrides for CRE (only those with manual enabled)
leadControlRouter.get('/manual', checkAuth, getManualOverrides);

// Get a specific manual override by CRE ID
leadControlRouter.get('/manual/:creId', checkAuth, getManualOverrideById);

// Create a new manual override for a CRE
leadControlRouter.post('/manual', checkAuth, createManualOverride);

// Update a manual override for a specific CRE
leadControlRouter.put('/manual/:creId', checkAuth, updateManualOverride);

// Delete a manual override for a specific CRE
leadControlRouter.delete('/manual/:creId', checkAuth, deleteManualOverride);

// Set auto Message
leadControlRouter.put('/autoMessage', checkAuth, updateAutoMessage);

// Export the leadControlRouter
module.exports = leadControlRouter;
