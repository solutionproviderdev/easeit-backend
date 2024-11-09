const express = require('express');

const { checkAuth } = require('../../middlewares/auth/checkAuth');
const {
    getAllCREsPerformanceData,
    getCREPerformanceDataById,
    getMeetingsData,
    getNotifications,
} = require('../../controller/dashboard/dashboardController');

// Router declaration
const dashBoardRouter = express.Router();

// Get cre performance
dashBoardRouter.get('/cre-performance', checkAuth, getAllCREsPerformanceData);

// Get CRE performance by id
dashBoardRouter.get('/cre-performance/:creId', checkAuth, getCREPerformanceDataById);

// Get monthly/weekly Meetings
dashBoardRouter.get('/meetings', checkAuth, getMeetingsData);

// Get notifications
dashBoardRouter.get('/notifications', checkAuth, getNotifications);

module.exports = dashBoardRouter;
