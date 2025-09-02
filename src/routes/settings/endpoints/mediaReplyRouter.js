const express = require('express');

const MediaReplyRouter = express.Router();

const ctrl = require('../../../controller/settings/mediaReplyController');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

// Get current user's auto reply settings
MediaReplyRouter.get('/', checkAuth, ctrl.getMine);

// Update current user's auto reply settings
MediaReplyRouter.patch('/', checkAuth, ctrl.updateMine);

module.exports = MediaReplyRouter;
