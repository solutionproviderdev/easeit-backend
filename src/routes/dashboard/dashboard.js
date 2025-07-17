const express = require('express');

const { checkAuth } = require('../../middlewares/auth/checkAuth');
const {
    getAllCREsPerformanceData,
    getCREPerformanceDataById,
    getMeetingsData,
    getNotifications,
    getDateWiseLeadData,
    getMeetingBarchartData,
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

// Date wise lead data
dashBoardRouter.get('/date-wise-lead-data', checkAuth, getDateWiseLeadData);

// Date and weekday wise meeting barchart data
dashBoardRouter.get('/meeting-barchart', checkAuth, getMeetingBarchartData);

module.exports = dashBoardRouter;
