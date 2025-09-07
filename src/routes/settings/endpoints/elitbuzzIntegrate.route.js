const express = require('express');
const {
    getElitbuzzIntegrate,
    createElitbuzzIntegration,
    updateElitbuzzIntegrate,
    sendMessage,
} = require('../../../controller/settings/elitbuzzIntegrate.controller');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const elitbuzzIntegrateRouter = express.Router();

// Get entire elitbuzzIntegrate settings document
elitbuzzIntegrateRouter.get('/', checkAuth, getElitbuzzIntegrate);

// Create or update elitbuzzIntegrate settings document
elitbuzzIntegrateRouter.post('/', checkAuth, createElitbuzzIntegration);

// send Message
elitbuzzIntegrateRouter.post('/send-message', checkAuth, sendMessage);

// Export the elitbuzzIntegrateRouter
module.exports = elitbuzzIntegrateRouter;
