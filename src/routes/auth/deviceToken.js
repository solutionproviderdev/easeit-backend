const express = require('express');
const {
    addDeviceToken,
    removeDeviceToken,
    addMobileDeviceToken,
} = require('../../controller/auth/deviceTokenController');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

const deviceTokenRouter = express.Router();

// Route to add/update a device token for a user
deviceTokenRouter.post('/', checkAuth, addDeviceToken);

// Route to remove a device token for a user
deviceTokenRouter.post('/remove', checkAuth, removeDeviceToken);

// add mobile device token
deviceTokenRouter.post('/mobile', checkAuth, addMobileDeviceToken);

module.exports = deviceTokenRouter;
