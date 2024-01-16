const express = require('express');
const {
    getFacebookSettings,
    postFacebookSettings,
    putFacebookSettings,
    deleteFacebookSettings,
    addFacebookPage,
    deleteFacebookPage,
} = require('../../../controller/settings/facebookController');

const facebookRouter = express.Router();

facebookRouter.get('/', getFacebookSettings);
facebookRouter.post('/', postFacebookSettings);
facebookRouter.post('/addpage', addFacebookPage);
facebookRouter.put('/', putFacebookSettings);
facebookRouter.delete('/', deleteFacebookSettings);
facebookRouter.delete('/deletepage', deleteFacebookPage);

module.exports = facebookRouter;
