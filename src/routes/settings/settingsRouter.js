// extarnal imports
const express = require('express');
const facebookRouter = require('./endpoints/facebook');
const leadControlRouter = require('./endpoints/leadControl');
const assistantRouter = require('./endpoints/assistantsRouter');
const savedMessageRouter = require('./endpoints/savedMessageRouter');
const MediaReplyRouter = require('./endpoints/mediaReplyRouter');
const aiIntregrationRouter = require('./endpoints/aiIntegration');

// declear router
const settingsRouter = express.Router();

// add subrouters
settingsRouter.use('/facebook', facebookRouter);
settingsRouter.use('/lead', leadControlRouter);
settingsRouter.use('/assistants', assistantRouter);
settingsRouter.use('/ai-integration', aiIntregrationRouter);
settingsRouter.use('/saved-messages', savedMessageRouter);
settingsRouter.use('/media-reply', MediaReplyRouter);

settingsRouter.get('/', (req, res) => {
    res.send('Settings Page');
});

module.exports = settingsRouter;
