/* eslint-disable no-restricted-syntax */
const express = require('express');

const leadSheetRouter = express.Router();

// Get lead report by name
leadSheetRouter.get('/report');

module.exports = leadSheetRouter;
