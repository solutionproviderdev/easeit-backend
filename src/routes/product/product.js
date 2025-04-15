const express = require('express');

// Internal Imports
const baseMaterialsRouter = require('./materials/baseMaterial');
const brandsRouter = require('./materials/brand');
const hardwareRouter = require('./materials/hardwear');
const surfaceRouter = require('./materials/surface');
const seriesRouter = require('./series');
const thicknessRouter = require('./materials/thickness');
const surfaceFinishRouter = require('./materials/surfaceFinish');
const edgingRouter = require('./composite_materials/edging');
const colorRouter = require('./color/color');
// const {} = require('../../controller/productController');
// const {} = require('../../validators/productValidator.js');

// Router Declaration
const productRouter = express.Router();

// materials
productRouter.use('/base-materials', baseMaterialsRouter);
productRouter.use('/brands', brandsRouter);
productRouter.use('/hardwears', hardwareRouter);
productRouter.use('/surfaces', surfaceRouter);
productRouter.use('/thickness', thicknessRouter);
productRouter.use('/surface-finishes', surfaceFinishRouter);

// composit Materials
productRouter.use('/edgings', edgingRouter);

// color
productRouter.use('/colors', colorRouter);

// Series
productRouter.use('/series', seriesRouter);

module.exports = productRouter;
