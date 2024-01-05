const express = require('express');

// Internal Imports
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    addMeterials,
    addMultipleMaterials,
    getAllMeterials,
    getSingleMeterials,
    updateMeterials,
    deleteMeterials,
} = require('../controller/meterialsController');

// Router Declearation
const meterialsRouter = express.Router();

// Get All Meterials
meterialsRouter.get('/', checkLogin, getAllMeterials);

// Get single Meterials
meterialsRouter.get('/:id', checkLogin, getSingleMeterials);

// Add a single Meterial
meterialsRouter.post('/', checkLogin, addMeterials);

// Add Multiple multiple product
meterialsRouter.post('/multiple', checkLogin, addMultipleMaterials);

// Update materials Details
meterialsRouter.put('/:id', checkLogin, updateMeterials);

// Delete a Meterials
meterialsRouter.delete('/:id', checkLogin, deleteMeterials);

module.exports = meterialsRouter;
