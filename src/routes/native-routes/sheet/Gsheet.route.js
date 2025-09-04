/* eslint-disable no-restricted-syntax */
const express = require('express');
const controller = require('../../../controller/lead/GSheetController');

const leadSheetRouter = express.Router();

// Get lead report by name
leadSheetRouter.get('/', controller.getLeadReportByName);

module.exports = leadSheetRouter;
