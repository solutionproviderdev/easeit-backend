const express = require('express');
const {
    getAllFacebookPages,
    addFacebookPage,
    deleteFacebookPage,
} = require('../../../controller/settings/facebookController');
const {
    fullSyncConversations,
} = require('../../../controller/settings/facebookFullSyncController');

const facebookRouter = express.Router();

// Get all Facebook pages
facebookRouter.get('/pages', getAllFacebookPages);

// Add a new Facebook page
facebookRouter.post('/pages', addFacebookPage);

// Delete a Facebook page
facebookRouter.delete('/pages', deleteFacebookPage);

// Trigger a full sync of Facebook conversations
facebookRouter.post('/pages/full-sync', fullSyncConversations);

module.exports = facebookRouter;
