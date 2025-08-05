const express = require('express');
const { checkLogin } = require('../../middlewares/auth/checkLogin');
const {
    getAllActivityLogs,
    deleteActivityLog,
    getActivityLogsByUserId,
} = require('../../controller/activityLogController');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

// Router Declaration
const activityLogRouter = express.Router();

// Get All Activity Logs
activityLogRouter.get('/', checkAuth, getAllActivityLogs);

// Delete an Activity Log
activityLogRouter.delete('/:id', checkAuth, deleteActivityLog);

// Get Activity Logs by User ID
activityLogRouter.get('/user/:userId', checkAuth, getActivityLogsByUserId);

module.exports = activityLogRouter;
