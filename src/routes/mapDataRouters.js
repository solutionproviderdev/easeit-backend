const express = require('express');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const {
    addMapData,
    getMapData,
    updateMapData,
    deleteMapData,
    updateVisitCharge,
} = require('../controller/mapDataController');

const mapDataRouter = express.Router();

mapDataRouter.get('/', checkLogin, getMapData);
mapDataRouter.post('/', checkLogin, addMapData);
mapDataRouter.put('/update-visit-charge/:areaId', checkLogin, updateVisitCharge);
mapDataRouter.put('/:id', checkLogin, updateMapData);
mapDataRouter.delete('/:id', checkLogin, deleteMapData);

module.exports = mapDataRouter;
