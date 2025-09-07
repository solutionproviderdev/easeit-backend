const express = require('express');
const {
    getAllFacebookPages,
    addFacebookPage,
    deleteFacebookPage,
} = require('../../../controller/settings/facebookController');

const facebookRouter = express.Router();

// Get all Facebook pages
facebookRouter.get('/pages', getAllFacebookPages);

// Add a new Facebook page
facebookRouter.post('/pages', addFacebookPage);

// Delete a Facebook page
facebookRouter.delete('/pages', deleteFacebookPage);

module.exports = facebookRouter;
