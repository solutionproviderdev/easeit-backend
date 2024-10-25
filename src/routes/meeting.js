const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    getAllMeetings,
    getSingleMeeting,
    updateMeeting,
    createMeeting,
} = require('../controller/meetingController');

// Router Declearation
const meetingsRouter = express.Router();

// Create a new meeting------------checkLogin
meetingsRouter.post('/',createMeeting);

// Get All meetings
meetingsRouter.get('/', getAllMeetings);

// Get single meetings
meetingsRouter.get('/:id', getSingleMeeting);

// Update meetings Details
meetingsRouter.put('/:id', updateMeeting);

module.exports = meetingsRouter;
