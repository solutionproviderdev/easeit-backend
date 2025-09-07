// extarnal imports
const express = require('express');
const facebookRouter = require('./endpoints/facebook.route');
const leadControlRouter = require('./endpoints/leadControl.route');
const assistantRouter = require('./endpoints/assistants.route');
const savedMessageRouter = require('./endpoints/savedMessage.route');
const MediaReplyRouter = require('./endpoints/mediaReply.route');
const aiIntregrationRouter = require('./endpoints/aiIntegration.route');
const elitbuzzIntegrateRouter = require('./endpoints/elitbuzzIntegrate.route');

// declear router
const settingsRouter = express.Router();

// add subrouters
settingsRouter.use('/facebook', facebookRouter);
settingsRouter.use('/lead', leadControlRouter);
settingsRouter.use('/assistants', assistantRouter);
settingsRouter.use('/ai-integration', aiIntregrationRouter);
settingsRouter.use('/saved-messages', savedMessageRouter);
settingsRouter.use('/media-reply', MediaReplyRouter);
settingsRouter.use('/elitbuzz-integration', elitbuzzIntegrateRouter);

settingsRouter.get('/', (req, res) => {
    res.send('Settings Page');
});

module.exports = settingsRouter;
