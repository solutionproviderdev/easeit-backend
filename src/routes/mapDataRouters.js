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
} = require('../controller/mapDataController');

const mapDataRouter = express.Router();

// Define the route for getting all divisions
mapDataRouter.get('/divisions', getDivisions);

// Define the route for getting districts by division ID
mapDataRouter.get('/:divisionId/districts', getDistrictsByDivision);

// Define the route for getting areas by district ID
mapDataRouter.get('/:districtId/areas', getAreasByDistrict);

// Search for locations by keyword (division, district, area)
mapDataRouter.get('/search', searchLocation);

mapDataRouter.get('/', checkLogin, getMapData);
mapDataRouter.post('/', checkLogin, addMapData);
mapDataRouter.put('/update-visit-charge/:areaId', checkLogin, updateVisitCharge);
mapDataRouter.put('/:id', checkLogin, updateMapData);
mapDataRouter.delete('/:id', checkLogin, deleteMapData);

module.exports = mapDataRouter;
