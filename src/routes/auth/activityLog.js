const express = require('express');
const { checkLogin } = require('../../middlewares/auth/checkLogin');
const {
    getAllActivityLogs,
    deleteActivityLog,
    getActivityLogsByUserId,
} = require('../../controller/activityLogController');

// Router Declaration
const activityLogRouter = express.Router();

// Get All Activity Logs
activityLogRouter.get('/', checkLogin, getAllActivityLogs);

// Delete an Activity Log
activityLogRouter.delete('/:id', checkLogin, deleteActivityLog);

// Get Activity Logs by User ID
activityLogRouter.get('/user/:userId', checkLogin, getActivityLogsByUserId);

module.exports = activityLogRouter;
