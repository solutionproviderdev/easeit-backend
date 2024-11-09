const express = require('express');

// Internal Imports
const { checkAuth } = require('../../middlewares/auth/checkAuth');
const {
    fixMeeting,
    postponeMeeting,
    rescheduleMeeting,
    cancelMeeting,
    getAllMeetings,
    getMeetingById,
    updateMeetingDetails,
    reassignOrSwapMeeting,
} = require('../../controller/meetingController');
const timeSlotsRouter = require('./timeSlots');
const {
    validateMeeting,
    meetingValidationRules,
    postponeMeetingValidationRules,
    rescheduleMeetingValidationRules,
    cancelMeetingValidationRules,
    updateMeetingDetailsValidationRules,
    reassignOrSwapMeetingValidationRules,
} = require('../../validators/meetingValidator');

// Router Declaration
const meetingsRouter = express.Router();

// Timeslots routes
meetingsRouter.use('/timeslots', timeSlotsRouter);

// Route to fix a new meeting
meetingsRouter.post('/fix', checkAuth, meetingValidationRules, validateMeeting, fixMeeting);

// Route to postpone a meeting
meetingsRouter.patch(
    '/:id/postpone',
    checkAuth,
    postponeMeetingValidationRules,
    validateMeeting,
    postponeMeeting
);

// Route to reschedule a meeting
meetingsRouter.patch(
    '/:id/reschedule',
    checkAuth,
    rescheduleMeetingValidationRules,
    validateMeeting,
    rescheduleMeeting
);

// Route to cancel a meeting
meetingsRouter.patch(
    '/:id/cancel',
    checkAuth,
    cancelMeetingValidationRules,
    validateMeeting,
    cancelMeeting
);

// Route to get all meetings with filtering options
meetingsRouter.get('/', checkAuth, getAllMeetings);

// Route to get details of a specific meeting by ID
meetingsRouter.get('/:id', checkAuth, getMeetingById);

// Route to update a meeting's details
meetingsRouter.patch(
    '/:id/update',
    checkAuth,
    updateMeetingDetailsValidationRules,
    validateMeeting,
    updateMeetingDetails
);

// Route to reassign or swap meetings between salespeople
meetingsRouter.patch(
    '/:id/reassign',
    checkAuth,
    reassignOrSwapMeetingValidationRules,
    validateMeeting,
    reassignOrSwapMeeting
);

module.exports = meetingsRouter;
