// extarnal imports
const express = require('express');
const facebookRouter = require('./endpoints/facebook');
const leadControlRouter = require('./endpoints/leadControl');
const assistantRouter = require('./endpoints/assistantsRouter');

// declear router
const settingsRouter = express.Router();

// add subrouters
settingsRouter.use('/facebook', facebookRouter);
settingsRouter.use('/lead', leadControlRouter);
settingsRouter.use('/assistants', assistantRouter);

settingsRouter.get('/', (req, res) => {
    res.send('Settings Page');
});

module.exports = settingsRouter;
