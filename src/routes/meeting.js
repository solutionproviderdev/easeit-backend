const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    getAllMeetings,
    getSingleMeeting,
    updateMeeting,
} = require('../controller/meetingController');

// Router Declearation
const meetingsRouter = express.Router();

// Get All meetings
meetingsRouter.get('/', checkLogin, getAllMeetings);

// Get single meetings
meetingsRouter.get('/:id', checkLogin, getSingleMeeting);

// Update meetings Details
meetingsRouter.put('/:id', checkLogin, updateMeeting);

module.exports = meetingsRouter;
