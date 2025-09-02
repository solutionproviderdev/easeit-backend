const express = require('express');
const {
    getGlobalConfig,
    updateGlobalConfig,
    updatePageAIIntegration,
} = require('../../../controller/settings/assistantController');

const aiIntregrationRouter = express.Router();

// get global Config
aiIntregrationRouter.get('/global-config', getGlobalConfig);

// update global Config
aiIntregrationRouter.put('/global-config', updateGlobalConfig);

// update page AI Integration
aiIntregrationRouter.put('/page/:id', updatePageAIIntegration);

module.exports = aiIntregrationRouter;
