const express = require('express');
const { calculateCabinet } = require('../../controller/calculator/calculator.controller');

const calculatorRouter = express.Router();

calculatorRouter.post('', calculateCabinet);

module.exports = calculatorRouter;
