const express = require('express');
const {
    createTeam,
    getTeamDetails,
    updateTeam,
    deleteTeam,
    listTeams,
    addMeetingToTeam,
    getMeetingsByDate,
    swapSlotsWithinTeam,
    swapMeetingBetweenTeams,
} = require('../controller/teamController');
const { checkLogin } = require('../middlewares/auth/checkLogin');

const teamRouter = express.Router();

teamRouter.post('/', checkLogin, createTeam);
teamRouter.get('/:id', checkLogin, getTeamDetails);
teamRouter.put('/:id', checkLogin, updateTeam);
teamRouter.delete('/:id', checkLogin, deleteTeam);
teamRouter.get('/', checkLogin, listTeams);
teamRouter.post('/addMeeting', checkLogin, addMeetingToTeam);
teamRouter.get('/meetings/:date', checkLogin, getMeetingsByDate);
teamRouter.post('/swapMeeting/:date', checkLogin, swapMeetingBetweenTeams);
teamRouter.post('/swapSlots/:date', checkLogin, swapSlotsWithinTeam);

module.exports = teamRouter;
