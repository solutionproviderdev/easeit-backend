// extarnal imports
const express = require('express');
const facebookRouter = require('./endpoints/facebook');
const leadControlRouter = require('./endpoints/leadControl');

// declear router
const settingsRouter = express.Router();

// add subrouters
settingsRouter.use('/facebook', facebookRouter);
settingsRouter.use('/lead', leadControlRouter);

settingsRouter.get('/', (req, res) => {
    res.send('Settings Page');
});

module.exports = settingsRouter;
