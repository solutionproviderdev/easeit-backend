const express = require('express');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    addMapData,
    getMapData,
    updateMapData,
    deleteMapData,
    updateVisitCharge,
    getDivisions,
    getDistrictsByDivision,
    getAreasByDistrict,
    searchLocation,
    addDistrictToDivision,
    addAreaToDistrict,
    salesReport,
} = require('../controller/mapDataController');
const { checkAuth } = require('../middlewares/auth/checkAuth');

const mapDataRouter = express.Router();

// Define the route for getting all map data
mapDataRouter.get('/', checkAuth, getMapData);

// Define the route for getting all divisions
mapDataRouter.get('/divisions', checkAuth, getDivisions);

// Define the route for getting districts by division ID
mapDataRouter.get('/:divisionId/districts', checkAuth, getDistrictsByDivision);

// Define the route for getting areas by district ID
mapDataRouter.get('/:districtId/areas', checkAuth, getAreasByDistrict);

// Search for locations by keyword (division, district, area)
mapDataRouter.get('/search', checkAuth, searchLocation);

// Add a new district to an existing division
mapDataRouter.post('/:divisionId/districts', checkAuth, addDistrictToDivision);

// Add a new area to an existing district
mapDataRouter.post('/:districtId/areas', checkAuth, addAreaToDistrict);

// Update the visit charge for an area
mapDataRouter.put('/update-visit-charge/:areaId', checkAuth, updateVisitCharge);

// report stats
mapDataRouter.get('/report/sale', salesReport);

mapDataRouter.post('/', checkLogin, addMapData);
mapDataRouter.put('/:id', checkLogin, updateMapData);
mapDataRouter.delete('/:id', checkLogin, deleteMapData);

module.exports = mapDataRouter;
