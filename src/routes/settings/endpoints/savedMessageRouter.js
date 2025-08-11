const express = require('express');

const savedMessageRouter = express.Router();

const ctrl = require('../../../controller/settings/SavedMessageController');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

// Create a saved message
savedMessageRouter.post('/', checkAuth, ctrl.createSavedMessage);

// List saved messages (with cursor pagination, filters, etc.)
savedMessageRouter.get('/', checkAuth, ctrl.listSavedMessages);

// Get a single saved message by ID
savedMessageRouter.get('/:id', checkAuth, ctrl.getSavedMessage);

// Update a saved message
savedMessageRouter.patch('/:id', checkAuth, ctrl.updateSavedMessage);

// Soft delete a saved message
savedMessageRouter.delete('/:id', checkAuth, ctrl.softDeleteSavedMessage);

// Restore a soft-deleted saved message
savedMessageRouter.post('/:id/restore', checkAuth, ctrl.restoreSavedMessage);

// (Optional) Hard delete for admin only
// router.delete('/:id/hard', checkAuth, ctrl.harddeleteSavedMessage);

module.exports = savedMessageRouter;
