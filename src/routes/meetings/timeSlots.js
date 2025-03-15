const express = require('express');
const {
    getAllActiveSlots,
    addTimeSlotToRight,
    addTimeSlotToLeft,
    deleteTimeSlotFromRight,
    deleteTimeSlotFromLeft,
    createDefaultTimeSlots,
    getFreeSlotsOfaDate,
    getGlobalFreeSlotsOfaDate,
} = require('../../controller/meetings/timeSlotsController');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

// Router declaration
const timeSlotsRouter = express.Router();

// Get all active slots
timeSlotsRouter.get('/', getAllActiveSlots);

// Add a new time slot to the right
timeSlotsRouter.post('/right', addTimeSlotToRight);

// Add a new time slot to the left
timeSlotsRouter.post('/left', addTimeSlotToLeft);

// Delete a time slot from the right
timeSlotsRouter.delete('/right', deleteTimeSlotFromRight);

// Delete a time slot from the left
timeSlotsRouter.delete('/left', deleteTimeSlotFromLeft);

// get free slots of a date
timeSlotsRouter.get('/freeSlots/:date', checkAuth, getFreeSlotsOfaDate);

// get Global free slots of a date
timeSlotsRouter.get('/freeSlotsGlobal/:date', getGlobalFreeSlotsOfaDate);

// Call the create default time slots function to initialize default slots
createDefaultTimeSlots();

module.exports = timeSlotsRouter;
