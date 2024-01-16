// extarnal imports
const express = require('express');
const facebookRouter = require('./endpoints/facebook');

// declear router
const settingsRouter = express.Router();

// add subrouters
settingsRouter.use('/facebook', facebookRouter);

settingsRouter.get('/', (req, res) => {
    res.send('Settings Page');
});

module.exports = settingsRouter;
